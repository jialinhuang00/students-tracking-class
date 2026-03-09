# ClassNudge

Class scheduling, LINE reminders, and attendance tracking for coaches.

## Stack

Next.js 15 | Supabase | Google Calendar (service account) | LINE Messaging API | shadcn/ui

## Setup

```bash
npm install
cp .env.local.example .env.local  # fill in credentials
npm run dev
```

### Env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role/secret key |
| `GOOGLE_CLIENT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_PROJECT_ID` | GCP project ID |
| `GOOGLE_CALENDAR_ID` | Target calendar ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE bot access token |
| `LINE_CHANNEL_SECRET` | LINE bot channel secret |

## Pages

| Route | What it does |
|-------|-------------|
| `/today` | Tomorrow's reminders, today's attendance, low balance alerts |
| `/line-users` | Student list, class balance, LINE status, history |
| `/notifications` | Select calendar events, send LINE reminders |
| `/attendance` | Calendar view, confirm/mark attendance |

## Workflow

1. Google Calendar holds class schedule (event title = student name)
2. Coach sends LINE reminders to students before class
3. Coach marks attendance after class
4. Attended → `remaining_classes` decremented

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run create-events` | Seed calendar with class events |
| `npm run cleanup-events` | Remove all calendar events |
| `npm run create-records` | Generate class records from calendar |

## DB

Tables: `coaches`, `students`, `class_records`, `notification_status`

Import `migrations/latest.sql` into Supabase SQL Editor, or restore from `.backup` (see `SUPABASE_RESTORE.md`).
