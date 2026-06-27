# Daily Journal (DJ)

A spreadsheet-style daily standup journal for engineering teams — one row per person per day, built on Next.js + Neon Postgres.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Seed credentials

Password pattern: `<firstname_lowercase>123` (e.g. `nayan123`). For names with a last initial, drop the initial (e.g. `serhii123`, `sergey123`).

| Designation | Name | Email | Password |
|-------------|------|-------|----------|
| **CTO** | Rohit Mahajan | rohit@convosight.com | rohit123 |
| PM | Aditya | aditya@convosight.com | aditya123 |
| PM | Kush | kush@convosight.com | kush123 |
| PM | Kirti | kirti@convosight.com | kirti123 |
| PM | Jayanth | jayanth@convosight.com | jayanth123 |
| PM | Poonam | poonam@convosight.com | poonam123 |
| PM | Jane | jane@convosight.com | jane123 |
| Design | Kseniia | kseniia@convosight.com | kseniia123 |
| QA | Sandesh | sandesh@convosight.com | sandesh123 |
| QA | Lana | lana@convosight.com | lana123 |
| QA | Anumeha | anumeha@convosight.com | anumeha123 |
| QA | Nishanth | nishanth@convosight.com | nishanth123 |
| QA | Sai | sai@convosight.com | sai123 |
| AI | Alex | alex@convosight.com | alex123 |
| AI | Tanzeer | tanzeer@convosight.com | tanzeer123 |
| AI | Amogh | amogh@convosight.com | amogh123 |
| BE | Serhii F | serhii@convosight.com | serhii123 |
| BE | Suraj | suraj@convosight.com | suraj123 |
| BE | Nayan | nayan@convosight.com | nayan123 |
| BE | Rochisha | rochisha@convosight.com | rochisha123 |
| BE | Dmytro | dmytro@convosight.com | dmytro123 |
| BE | Vlad | vlad@convosight.com | vlad123 |
| FE | Yevhen | yevhen@convosight.com | yevhen123 |
| FE | Vitaliy | vitaliy@convosight.com | vitaliy123 |
| FE | Ishika | ishika@convosight.com | ishika123 |
| FE | Nazar | nazar@convosight.com | nazar123 |
| DevOps | Sergey S | sergey@convosight.com | sergey123 |
| DevOps | Nirali | nirali@convosight.com | nirali123 |

## Roles & permissions

| Role | Can edit |
|------|----------|
| **engineer** | Own row: Streams, Today, Yesterday, Blocked On, Documents |
| **cto** | RM Comments on **any** row |
| **pm** | Trigger rollover, manage users, edit any engineer row |
| **ceo** | Read-only view |

## Database

Data is stored in [Neon](https://neon.tech) (serverless Postgres) and persists across restarts and deployments.

The schema is auto-applied on startup via `src/db/schema.ts`. Seed data (users, streams) is inserted once on first run via `src/db/seed.ts` and skipped if already present.

## File uploads

Files are stored as base64 in the Postgres database. They are:
- Limited to **2 MB per file** (enforced client-side)
- Persistent across restarts
- Not suitable for large-scale use — swap to S3/R2/Cloudflare if storage becomes a concern

## Daily rollover

Two ways to roll over to a new day:

1. **Automatic (lazy):** On the first `GET /api/entries?date=today` request of a new day, if the rollover hasn't run yet, it runs automatically before returning entries.

2. **Manual:** PM/CTO users see a **"Start new day"** button in the header that calls `POST /api/rollover`. It is idempotent — running it twice does nothing harmful.

**What rollover does:**
- Creates a new entry row for each active user
- Carries `today → yesterday` from the previous day
- Clears `today`, `rmComments`, `blockedOn` for the fresh day
- Copies the most recent streams as defaults

**What rollover never does:**
- Does not delete or modify any historical rows
- Does not overwrite a row that already has content

## Vercel cron (optional)

`vercel.json` includes a cron job that calls `POST /api/rollover` daily at 3 AM UTC (adjust as needed). On Vercel, set the `CRON_SECRET` environment variable and the cron job will pass it as a Bearer token.

> **Note:** With Neon as the database, cron-triggered rollovers persist correctly across all serverless invocations.

## Deploy to Vercel

```bash
npm i -g vercel
vercel deploy
```

Set environment variables in the Vercel dashboard:
- `DB_DATABASE_URL` — Neon connection string (add via the Neon integration or manually)
- `JWT_SECRET` — a long random string for signing session tokens
- `CRON_SECRET` — a long random string for securing the cron endpoint (optional)

## Anti-overwrite guarantees test

```bash
# With the dev server running:
npm run test:guarantees
```

This script proves:
- **(A)** A save with a stale version is rejected with HTTP 409 — no silent clobber.
- **(B)** Running rollover twice on a day with filled content leaves the content intact.

## Customising streams

Edit the `STREAMS` array in `src/db/seed.ts`. The array is clearly marked at the top of the file. Changes take effect on next server restart — new streams are inserted if missing, but existing ones are not deleted.
