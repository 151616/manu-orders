# Operations Runbook

## Scope
- Current DB mode in this repo: SQLite (`provider = "sqlite"` in `prisma/schema.prisma`).
- Primary objective: recoverable backups and fast restore.

## Backup Targets
- `dev`: local `file:./dev.db` (from `.env`).
- `prod`: SQLite DB file configured via `DATABASE_URL` (for example `file:/var/lib/manuqueue/prod.db`).
- File uploads: `public/uploads/` (order attachments).

## SQLite Backup (Dev)
1. Ensure the app can access the DB file.
2. Run:

```bash
npm run db:backup
```

Output:
- Creates a timestamped zip in `backups/sqlite/`.
- Example: `backups/sqlite/dev-20260305-221500Z.sqlite.zip`.

## SQLite Backup (Prod)
Run with explicit location and retention:

```bash
npm run db:backup -- --backup-dir /var/backups/manuqueue --keep-days 30
```

PowerShell example:

```powershell
npm run db:backup -- --backup-dir C:\backups\manuqueue --keep-days 30
```

Notes:
- `DATABASE_URL` must point to a SQLite file (`file:...`).
- Script behavior:
  - Copies DB file to a timestamped file.
  - Creates a `.zip`.
  - Removes the temporary uncompressed copy.
  - Prunes old zip files older than `--keep-days` (default `30`).
- If attachments are in use, back up `public/uploads/` on the same schedule.

## Daily Automation
Use your scheduler to run `db:backup` daily.

Cron (Linux) example, daily at 02:00:

```bash
0 2 * * * cd /srv/manu-orders && /usr/bin/npm run db:backup -- --backup-dir /var/backups/manuqueue --keep-days 30 >> /var/log/manuqueue-backup.log 2>&1
```

Task Scheduler (Windows) action example:

```powershell
powershell -NoProfile -Command "Set-Location C:\manu-orders; npm run db:backup -- --backup-dir C:\backups\manuqueue --keep-days 30"
```

## SQLite Restore
1. Stop writes to the app (recommended: stop app process temporarily).
2. Pick a backup archive.
3. Restore:

```bash
npm run db:restore -- --archive backups/sqlite/dev-20260305-221500Z.sqlite.zip
```

Or restore latest zip in backup dir:

```bash
npm run db:restore
```

Optional target override:

```bash
npm run db:restore -- --archive /var/backups/manuqueue/prod-20260305-221500Z.sqlite.zip --target-file /var/lib/manuqueue/prod.db
```

Safety behavior:
- If target DB exists, restore creates `*.pre-restore-<timestamp>.sqlite` before overwrite.
- To skip this (not recommended):

```bash
npm run db:restore -- --archive <path-to-zip> --skip-safety-backup
```

## Recommended Retention
- Keep daily backups for at least 30 days.
- Keep monthly snapshots for 12 months in off-host storage.
- Keep one immutable/offline copy (object lock or similar) for ransomware resilience.
- Run a restore drill at least once per quarter.
- Keep DB backup and `public/uploads/` backup from the same date to avoid metadata/file mismatch.

## If Migrating to Postgres
If production moves to Postgres, enable provider-managed backups first (RDS/Cloud SQL/Neon/Supabase/etc.), then keep logical exports:

Managed backup guidance:
- Enable automated backups and point-in-time recovery (PITR).
- Verify backup window and retention in provider console.

`pg_dump` example:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=manuqueue-$(date +%F).dump
```

`pg_restore` example:

```bash
createdb manuqueue_restore
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" manuqueue-2026-03-05.dump
```
