# Supabase Backup Restore

How we restored a paused Supabase project (90+ days inactive) to a new project.

## Problem

Supabase pauses free-tier projects after 90 days of inactivity. Once paused too long, you can't unpause directly -- you download a backup and restore to a new project.

## Steps

### 1. Download backup from paused project

Supabase Dashboard shows a "Download backup" option for paused projects. The file looks like:

```
db_cluster-05-09-2025@15-33-11.backup
```

Despite the `.backup` extension, this is a **text-format** SQL dump (not binary).

### 2. Create a new Supabase project

Create a new project in the same org. Note the database password.

### 3. Get connection string

Dashboard > top-right **Connect** button > copy the URI:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 4. Restore with psql

The backup is text format, so use `psql` (not `pg_restore`).

Can't just paste into Supabase SQL Editor because:
- The dump contains `\` psql meta-commands that SQL Editor doesn't understand
- File size may exceed SQL Editor limits
- psql runs statements sequentially; SQL Editor may not preserve order

Run from terminal instead:

```bash
/Applications/Postgres.app/Contents/Versions/17/bin/psql \
  "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f ~/Downloads/db_cluster-05-09-2025@15-33-11.backup
```

Requires Postgres.app (or `brew install postgresql`). Postgres.app bundles `psql` at `/Applications/Postgres.app/Contents/Versions/17/bin/`.

### 5. Ignore role errors

The restore outputs many errors like:

```
ERROR: role "anon" already exists
ERROR: "authenticated" is a reserved role
```

These are safe to ignore. Supabase pre-creates these roles. Your tables and data restore fine.

### 6. Verify

```bash
psql [CONNECTION_STRING] -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 7. Update .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_xxx
```

Get API keys from Dashboard > Project Settings > API Keys. New format uses `sb_` prefix (replaces legacy `ey...` JWT keys). Both formats work with Supabase JS client.

Restart dev server after changing env vars.
