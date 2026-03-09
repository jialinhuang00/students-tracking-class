# Coach Management System

Track student classes, send LINE reminders, sync with Google Calendar.

## Stack

Next.js 15 | Supabase | Google Calendar (service account) | LINE Messaging API

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GOOGLE_CLIENT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_PROJECT_ID` | GCP project ID |
| `GOOGLE_CALENDAR_ID` | Target calendar ID |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE bot access token |
| `LINE_CHANNEL_SECRET` | LINE bot channel secret |

## Workflow

1. Google Calendar holds class schedule (event title: `姓名 電話`)
2. System sends LINE reminders to students before class
3. Coach marks attendance after class
4. Attended → `remaining_classes` decremented

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run create-events` | Seed calendar with class events |
| `npm run cleanup-events` | Remove all calendar events |
| `npm run create-records` | Generate class records from calendar |

## DB Setup

Import `migrations/latest.sql` into Supabase SQL Editor.
