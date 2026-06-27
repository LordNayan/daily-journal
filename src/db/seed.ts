import { sql } from './client'
import bcrypt from 'bcryptjs'

export const STREAMS = [
  'AC1 Data · Rust · backend',
  'AC2: topical insights / themes',
  'VSCP · Video Social Consumer Persona',
  'Tagging Optimization',
  'CVI Optimization',
  'Cost Saving',
  'Data Lifeline - DL',
  'Security',
  'Client Delight',
  'Client Intelligence - MEC',
  'Aria 4/5 · Deep + Lite',
  'Trends On · Charts',
  'BAU Improvements (normal)',
  'Client requirements',
  'IPI · Insights Purchase Intent',
  'Aria → GPT & Claude',
  'Workflows',
  'Scale and Infra',
  'Sunsetting ST',
  'Risk prevention',
]

const SEED_USERS: {
  name: string
  email: string
  password: string
  role: 'engineer' | 'cto' | 'pm' | 'admin' | 'ceo'
  designation: string
}[] = [
  // ── PM ──
  { name: 'Aditya', email: 'aditya@convosight.com', password: 'aditya123', role: 'pm', designation: 'PM' },
  { name: 'Kush', email: 'kush@convosight.com', password: 'kush123', role: 'pm', designation: 'PM' },
  { name: 'Kirti', email: 'kirti@convosight.com', password: 'kirti123', role: 'pm', designation: 'PM' },
  { name: 'Jayanth', email: 'jayanth@convosight.com', password: 'jayanth123', role: 'pm', designation: 'PM' },
  { name: 'Poonam', email: 'poonam@convosight.com', password: 'poonam123', role: 'pm', designation: 'PM' },
  { name: 'Jane', email: 'jane@convosight.com', password: 'jane123', role: 'admin', designation: 'PM' },
  // ── Design ──
  { name: 'Kseniia', email: 'kseniia@convosight.com', password: 'kseniia123', role: 'engineer', designation: 'Design' },
  // ── QA ──
  { name: 'Sandesh', email: 'sandesh@convosight.com', password: 'sandesh123', role: 'engineer', designation: 'QA' },
  { name: 'Lana', email: 'lana@convosight.com', password: 'lana123', role: 'engineer', designation: 'QA' },
  { name: 'Anumeha', email: 'anumeha@convosight.com', password: 'anumeha123', role: 'engineer', designation: 'QA' },
  { name: 'Nishanth', email: 'nishanth@convosight.com', password: 'nishanth123', role: 'engineer', designation: 'QA' },
  { name: 'Sai', email: 'sai@convosight.com', password: 'sai123', role: 'engineer', designation: 'QA' },
  // ── AI ──
  { name: 'Alex', email: 'alex@convosight.com', password: 'alex123', role: 'engineer', designation: 'AI' },
  { name: 'Tanzeer', email: 'tanzeer@convosight.com', password: 'tanzeer123', role: 'engineer', designation: 'AI' },
  { name: 'Amogh', email: 'amogh@convosight.com', password: 'amogh123', role: 'engineer', designation: 'AI' },
  // ── BE ──
  { name: 'Serhii F', email: 'serhii@convosight.com', password: 'serhii123', role: 'engineer', designation: 'BE' },
  { name: 'Suraj', email: 'suraj@convosight.com', password: 'suraj123', role: 'engineer', designation: 'BE' },
  { name: 'Nayan', email: 'nayan@convosight.com', password: 'nayan123', role: 'engineer', designation: 'BE' },
  { name: 'Rochisha', email: 'rochisha@convosight.com', password: 'rochisha123', role: 'engineer', designation: 'BE' },
  { name: 'Dmytro', email: 'dmytro@convosight.com', password: 'dmytro123', role: 'engineer', designation: 'BE' },
  { name: 'Vlad', email: 'vlad@convosight.com', password: 'vlad123', role: 'engineer', designation: 'BE' },
  // ── FE ──
  { name: 'Yevhen', email: 'yevhen@convosight.com', password: 'yevhen123', role: 'engineer', designation: 'FE' },
  { name: 'Vitaliy', email: 'vitaliy@convosight.com', password: 'vitaliy123', role: 'engineer', designation: 'FE' },
  { name: 'Ishika', email: 'ishika@convosight.com', password: 'ishika123', role: 'engineer', designation: 'FE' },
  { name: 'Nazar', email: 'nazar@convosight.com', password: 'nazar123', role: 'engineer', designation: 'FE' },
  // ── DevOps ──
  { name: 'Sergey S', email: 'sergey@convosight.com', password: 'sergey123', role: 'engineer', designation: 'DevOps' },
  { name: 'Nirali', email: 'nirali@convosight.com', password: 'nirali123', role: 'engineer', designation: 'DevOps' },
  // ── CTO ──
  { name: 'Rohit Mahajan', email: 'rohit@convosight.com', password: 'rohit123', role: 'cto', designation: 'CTO' },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function maybeSeed(): Promise<void> {
  const rows = await sql`SELECT COUNT(*) AS count FROM users`
  if (Number(rows[0].count) === 0) {
    await seedDatabase()
  }
}

export async function seedDatabase(): Promise<void> {
  for (const name of STREAMS) {
    await sql`INSERT INTO streams (name) VALUES (${name}) ON CONFLICT DO NOTHING`
  }

  for (const u of SEED_USERS) {
    const hash = bcrypt.hashSync(u.password, 10)
    await sql`
      INSERT INTO users (name, email, "passwordHash", role, designation, "mustChangePassword")
      VALUES (${u.name}, ${u.email}, ${hash}, ${u.role}, ${u.designation}, 1)
      ON CONFLICT DO NOTHING
    `
  }

  await sql`INSERT INTO settings (key, value) VALUES ('rollover_time', '14:30') ON CONFLICT DO NOTHING`
  await sql`INSERT INTO settings (key, value) VALUES ('last_rollover_date', '') ON CONFLICT DO NOTHING`

  const beEngineers = await sql`SELECT id, name FROM users WHERE designation = 'BE'`
  const allStreams = await sql`SELECT id, name FROM streams`
  const streamByName = Object.fromEntries(allStreams.map((s) => [s.name as string, s.id as number]))

  const sampleData: { today: string; yesterday: string; streams: string[] }[] = [
    {
      today: 'Working on AC1 Rust ingestion layer — benchmarking throughput improvements.',
      yesterday: 'Fixed a deadlock in the async queue handler. Merged after review.',
      streams: ['AC1 Data · Rust · backend', 'Scale and Infra'],
    },
    {
      today: 'Refactoring the IPI scoring pipeline to cut latency. PR up for review.',
      yesterday: 'Investigated high p99 on the insights API. Traced to N+1 DB queries.',
      streams: ['IPI · Insights Purchase Intent', 'Cost Saving'],
    },
    {
      today: 'Integrating Claude API into Aria 5 deep mode. Prompt tuning in progress.',
      yesterday: 'Deployed Aria 4 lite to staging. Monitoring looks healthy.',
      streams: ['Aria 4/5 · Deep + Lite', 'Aria → GPT & Claude'],
    },
    {
      today: 'Working on the data lifeline pipeline — adding retry logic for failed jobs.',
      yesterday: 'Reviewed the DL schema changes with Aditya. Finalized approach.',
      streams: ['Data Lifeline - DL', 'BAU Improvements (normal)'],
    },
    {
      today: 'Hardening auth middleware for the security audit findings from last week.',
      yesterday: 'Wrote unit tests for the token rotation logic. All green.',
      streams: ['Security', 'Risk prevention'],
    },
    {
      today: 'Optimising CVI export pipeline — reducing S3 round trips.',
      yesterday: 'Fixed a bug in the tagging service where duplicate tags were being created.',
      streams: ['CVI Optimization', 'Tagging Optimization'],
    },
  ]

  for (let daysBack = 2; daysBack >= 1; daysBack--) {
    const date = daysAgo(daysBack)
    for (let i = 0; i < beEngineers.length; i++) {
      const eng = beEngineers[i]
      const sample = sampleData[i % sampleData.length]
      const todayText = daysBack === 1 ? sample.today : sample.yesterday
      const yestText = daysBack === 2 ? '' : sample.yesterday

      await sql`
        INSERT INTO entries (date, "userId", today, yesterday, "rmComments", "blockedOn", version)
        VALUES (${date}, ${eng.id}, ${todayText}, ${yestText}, '', '', 1)
        ON CONFLICT DO NOTHING
      `

      const entryRows = await sql`SELECT id FROM entries WHERE date = ${date} AND "userId" = ${eng.id}`
      const entry = entryRows[0]
      if (entry) {
        for (const sName of sample.streams) {
          const sId = streamByName[sName]
          if (sId) {
            await sql`
              INSERT INTO entry_streams ("entryId", "streamId") VALUES (${entry.id}, ${sId})
              ON CONFLICT DO NOTHING
            `
          }
        }
      }
    }
  }

  await sql`UPDATE settings SET value = ${daysAgo(1)} WHERE key = 'last_rollover_date'`
}
