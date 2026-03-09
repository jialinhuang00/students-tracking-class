# Refactor Plan

## Current State

Next.js app. Supabase DB. Google Calendar via service account. LINE Messaging API for student notifications.

The project was built months ago. Four 500-660 line page components. No tests. Several `any` types. One dead component. One unused dependency. No CLAUDE.md. README missing.

---

## Phase 1: UX Redesign — Coach-First Workflow

Problem: The current layout treats dashboard, attendance, notifications, LINE users as equal tabs. A coach doesn't think in tabs. A coach thinks in daily actions.

### 1.1 Daily Workflow: "Notify Tomorrow's Students"

Current: Coach navigates to Notifications page, selects students, sends LINE messages manually.

Target: Dashboard shows a single card — "Tomorrow's Classes (3 students)". One button: "Send Reminders". Done.

- Pull tomorrow's events from Google Calendar
- Match students by name/phone from Supabase
- Send LINE notifications to matched students with `line_user_id`
- Show success/failure inline

### 1.2 Post-Class: "Mark Attendance and Deduct"

Current: Coach navigates to Attendance page, checks boxes, confirms. Separate from class records.

Target: Dashboard shows "Today's Classes" card. Each student row has: attended / absent / cancelled. One tap marks status. Attended auto-deducts `remaining_classes`. Absent records the no-show.

- Merge attendance confirmation and class record completion into one action
- Show remaining classes next to each student name
- Color-code: green (attended), red (absent), grey (cancelled)

### 1.3 At a Glance: Student Health

Current: No quick view of "who's running low on classes".

Target: Small section — "Low Balance Students" — students with `remaining_classes <= 2`. Coach sees it every day without clicking anything.

### 1.4 Layout Simplification

Current navigation: Dashboard | Attendance | Notifications | LINE Users

Target navigation: Today | Students | Settings

- **Today**: Tomorrow's reminders + Today's attendance + Low balance alerts
- **Students**: List with search, class balance, LINE status, history
- **Settings**: LINE bot info, Google Calendar config

---

## Phase 2: Code Hygiene — Fix What the Scan Found

### 2.1 P0: Kill `any` types

| File | Line | Fix |
|------|------|-----|
| `app/page.tsx:35` | `details?: any` | Define `TaskDetails` interface |
| `app/page.tsx:520,626` | `student: any` | Type as `{ name: string; phone?: string; error?: string }` |
| `app/notifications/page.tsx:38,477` | `details: any` / `student: any` | Same `TaskDetails` interface |
| `app/api/students/update/route.ts:15` | `updateData: any` | Type as `Partial<Student>` |
| `app/api/dashboard/complete-attendance/route.ts:62` | `record: any` | Type as `ClassRecord` |
| `app/attendance/page.tsx:269` | `props as any` | Fix checkbox props typing |

### 2.2 P1: Split Oversized Pages

After UX redesign (Phase 1), the current 4 pages become 3 simpler pages. But extraction still needed:

- Extract `TomorrowReminders` component from notification logic
- Extract `TodayAttendance` component from attendance logic
- Extract `StudentBalanceAlert` component
- Extract shared `ResultDialog` component (used in 3 pages)
- Extract API fetch hooks into `hooks/` directory

### 2.3 P1: Delete Dead Code

- Delete `components/ui/checkbox-pure.tsx` — zero importers
- Un-export `getCalendar()`, `formatDateTime()` in `lib/google-calendar.ts` — internal only

### 2.4 P2: Remove Unused Dependencies

```bash
npm uninstall date-fns
```

---

## Phase 3: Project Documentation

### 3.1 README.md

| Section | Content |
|---------|---------|
| What | ClassNudge — LINE + Google Calendar + Supabase |
| Stack | Next.js 15, Supabase, Google Calendar (service account), LINE Messaging API |
| Setup | env vars needed, `npm install`, `npm run dev` |
| Scripts | `create-events`, `cleanup-events`, `create-records` |

Keep under 50 lines.

### 3.2 CLAUDE.md

```
# ClassNudge

Next.js 15 app in `app/` directory (App Router). No `src/` folder.

## Stack
- DB: Supabase (lib/supabase.ts)
- Calendar: Google Calendar via service account (lib/google-calendar.ts)
- Messaging: LINE Messaging API via @line/bot-sdk (lib/line.ts)
- UI: Tailwind + Radix UI primitives (components/ui/)

## Key Paths
- API routes: app/api/
- Pages: app/page.tsx, app/attendance/, app/notifications/, app/line-users/
- DB types: lib/supabase.ts (Coach, Student, ClassRecord)
- Scripts: scripts/ (calendar events, class records)

## Conventions
- All API routes use try/catch with NextResponse.json()
- Dates use dayjs (not date-fns)
- No test files yet
```

---

## Execution Order

1. CLAUDE.md (5 min — unblocks future sessions)
2. README.md (10 min)
3. Delete dead code + unused deps (5 min)
4. Fix `any` types (15 min)
5. UX redesign: build "Today" page with 3 cards (larger effort)
6. Extract components from oversized pages
7. Add tests for API routes (future)
