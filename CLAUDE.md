# Coach Management System

Next.js 15 app using App Router. No `src/` folder — code lives in `app/`, `lib/`, `components/`.

## Stack

| Layer | Tech | Config |
|-------|------|--------|
| DB | Supabase | `lib/supabase.ts` |
| Calendar | Google Calendar (service account) | `lib/google-calendar.ts` |
| Messaging | LINE Messaging API (`@line/bot-sdk`) | `lib/line.ts` |
| UI | Tailwind + Radix primitives | `components/ui/` |

## Key Paths

- API routes: `app/api/` — all use try/catch + `NextResponse.json()`
- Pages: `app/page.tsx` (dashboard), `app/attendance/`, `app/notifications/`, `app/line-users/`
- DB types: `lib/supabase.ts` — `Coach`, `Student`, `ClassRecord`
- Scripts: `scripts/` — `create-calendar-events`, `cleanup-calendar-events`, `create-class-records`

## Conventions

- Dates: use `dayjs` (not `date-fns`)
- No test files yet
- Google Calendar event title format: `姓名 電話號碼`
- Workflow: Calendar events → create students + class_records → LINE notify → confirm attendance → deduct remaining_classes
