# ClassNudge

Next.js 15 App Router. No `src/` folder — code in `app/`, `lib/`, `components/`.

## Stack

| Layer | Tech | Config |
|-------|------|--------|
| DB | Supabase (PostgreSQL) | `lib/supabase.ts` |
| Calendar | Google Calendar (service account) | `lib/google-calendar.ts` |
| Messaging | LINE Messaging API (`@line/bot-sdk`) | `lib/line.ts` |
| UI | Tailwind + shadcn/ui (Radix primitives) | `components/ui/` |

## Key Paths

- Pages: `app/today/` (dashboard), `app/attendance/`, `app/notifications/`, `app/line-users/`
- API routes: `app/api/` — all use try/catch + `NextResponse.json()`
- Components: `components/` — `navigation.tsx`, `tomorrow-reminders.tsx`, `today-attendance.tsx`, `low-balance-alert.tsx`
- DB types: `lib/supabase.ts` — `Coach`, `Student`, `ClassRecord`
- Scripts: `scripts/` — `create-calendar-events`, `cleanup-calendar-events`, `create-class-records`

## Conventions

- Dates: use `dayjs` (not `date-fns`)
- UI: shadcn/ui components (`Button`, `Card`, `Badge`, `AlertDialog`, `Sheet`, `Breadcrumb`, `NavigationMenu`, `Separator`, `Calendar`)
- Navigation: breadcrumb style, no nav bar
- No test files yet
- Google Calendar event title = student name
- Supabase joins return arrays (cast with `as Type[]` then `[0]`)

## Workflow

Calendar events → send LINE reminders → confirm attendance → deduct `remaining_classes`
