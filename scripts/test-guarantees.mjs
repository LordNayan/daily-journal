/**
 * Anti-overwrite guarantees test script.
 * Run against a live dev server:  npm run test:guarantees
 *
 * Proves:
 *  (A) Stale-version saves are rejected (409) — a save with an outdated version
 *      never silently overwrites a newer value.
 *  (B) Rollover is idempotent — running it twice never blanks a row that already
 *      has content in the Today field.
 */

const BASE = process.env.DJ_URL ?? 'http://localhost:3000'

async function request(method, path, body, cookies) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json() }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/dj-session=([^;]+)/)
  if (!match) throw new Error(`Login failed for ${email}: ${await res.text()}`)
  return `dj-session=${match[1]}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function pass(msg) { console.log(`  ✅ PASS  ${msg}`) }
function fail(msg) { console.error(`  ❌ FAIL  ${msg}`); process.exitCode = 1 }

// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📋 Daily Journal anti-overwrite guarantee tests\n')

  // ── Login as two engineers
  let cookieA, cookieB, cookiePM
  try {
    cookieA = await login('ananya@convosight.com', 'ananya123')
    cookieB = await login('vikram@convosight.com', 'vikram123')
    cookiePM = await login('priya@convosight.com', 'priya123')
    pass('Login: both engineers + PM authenticated')
  } catch (e) {
    fail(`Login failed — is the server running? (${e.message})`)
    return
  }

  // ── Fetch today's entries for engineer A
  const { body: entries } = await request('GET', `/api/entries?date=${today()}`, null, cookieA)
  const entryA = entries.find((e) => e.user.email === 'ananya@convosight.com')
  if (!entryA) { fail('Could not find entry for ananya@convosight.com'); return }
  pass(`Found entry id=${entryA.id} version=${entryA.version}`)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST A: Stale-version rejection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[A] Stale-version conflict protection')

  // A1: First write succeeds, advances version
  const { status: s1, body: b1 } = await request(
    'PATCH', `/api/entries/${entryA.id}`,
    { field: 'today', value: 'First write by A', version: entryA.version },
    cookieA
  )
  if (s1 === 200) {
    pass(`A1: first write accepted (new version=${b1.version})`)
  } else {
    fail(`A1: expected 200, got ${s1}`)
    return
  }
  const newVersion = b1.version

  // A2: Second write with the OLD version → must be rejected with 409
  const { status: s2, body: b2 } = await request(
    'PATCH', `/api/entries/${entryA.id}`,
    { field: 'today', value: 'Stale overwrite attempt', version: entryA.version },
    cookieA
  )
  if (s2 === 409) {
    pass(`A2: stale-version save correctly rejected (409 Conflict)`)
  } else {
    fail(`A2: expected 409, got ${s2} — overwrite was NOT blocked!`)
  }

  // A3: Verify the value on disk is still the FIRST write (not the stale one)
  const { body: check } = await request('GET', `/api/entries?date=${today()}`, null, cookieA)
  const checked = check.find((e) => e.id === entryA.id)
  if (checked?.today === 'First write by A') {
    pass('A3: stored value is the first (valid) write — stale write did not clobber it')
  } else {
    fail(`A3: stored value is "${checked?.today}" — expected "First write by A"`)
  }

  // A4: Write with the CORRECT new version → succeeds
  const { status: s4 } = await request(
    'PATCH', `/api/entries/${entryA.id}`,
    { field: 'today', value: 'Updated with correct version', version: newVersion },
    cookieA
  )
  if (s4 === 200) {
    pass('A4: write with correct version accepted')
  } else {
    fail(`A4: expected 200, got ${s4}`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST B: Rollover idempotency — never blanks filled Today
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[B] Rollover idempotency')

  // B1: Set a distinct Today value
  const marker = `MARKER-${Date.now()}`
  const { body: preRollover } = await request(
    'GET', `/api/entries?date=${today()}`, null, cookieA
  )
  const entryForB = preRollover.find((e) => e.user.email === 'ananya@convosight.com')
  await request(
    'PATCH', `/api/entries/${entryForB.id}`,
    { field: 'today', value: marker, version: entryForB.version },
    cookieA
  )
  pass(`B1: set Today = "${marker}"`)

  // B2: Run rollover (first time)
  const { status: r1 } = await request('POST', '/api/rollover', { date: today() }, cookiePM)
  if (r1 === 200) {
    pass('B2: first rollover call succeeded')
  } else {
    fail(`B2: rollover returned ${r1}`)
  }

  // B3: Run rollover again (second time — idempotent)
  const { status: r2, body: rb2 } = await request('POST', '/api/rollover', { date: today() }, cookiePM)
  if (r2 === 200 && rb2.created === 0) {
    pass(`B3: second rollover call is idempotent (created=0)`)
  } else {
    fail(`B3: expected created=0, got status=${r2} created=${rb2.created}`)
  }

  // B4: Verify Today still has the marker value after both rollovers
  const { body: afterRollover } = await request(
    'GET', `/api/entries?date=${today()}`, null, cookieA
  )
  const afterEntry = afterRollover.find((e) => e.user.email === 'ananya@convosight.com')
  if (afterEntry?.today === marker) {
    pass(`B4: Today value "${marker}" survived rollover — filled content was NOT blanked`)
  } else {
    fail(`B4: Today is "${afterEntry?.today}" — rollover wiped the filled content!`)
  }

  console.log('\n' + (process.exitCode ? '❌ Some tests failed.' : '✅ All guarantees verified.') + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
