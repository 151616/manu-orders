# Operations Runbook

## Scope

- Database mode: PostgreSQL (`provider = "postgresql"` in `prisma/schema.prisma`).
- Attachment storage:
  - `local`: files in `public/uploads/`
  - `firebase`: files in Firebase Storage bucket (`FIREBASE_STORAGE_BUCKET`)

## Backup Strategy

1. Use managed PostgreSQL backups first (Cloud SQL/Neon/Supabase/RDS/PITR).
2. Add regular logical exports with `pg_dump`.
3. Ensure attachment backup posture matches storage driver:
   - `local`: back up `public/uploads/`
   - `firebase`: enable bucket object versioning/lifecycle retention

## PostgreSQL Backup

Set `DATABASE_URL` and run:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backups/postgres/manuqueue-$(date +%F).dump
```

PowerShell example:

```powershell
pg_dump $env:DATABASE_URL --format=custom --file backups/postgres/manuqueue-$(Get-Date -Format yyyy-MM-dd).dump
```

## PostgreSQL Restore

1. Restore into a fresh DB first for validation.
2. Run:

```bash
createdb manuqueue_restore
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" backups/postgres/manuqueue-2026-03-05.dump
```

PowerShell example:

```powershell
pg_restore --clean --if-exists --no-owner --dbname $env:RESTORE_DATABASE_URL backups/postgres/manuqueue-2026-03-05.dump
```

## Firebase Storage Protection

If `ORDER_ATTACHMENT_STORAGE_DRIVER=firebase`:

1. Enable object versioning on the bucket.
2. Add lifecycle rules for retention windows.
3. Restrict bucket IAM to app runtime/service accounts only.

## Local Attachment Backup (Only if `local` driver)

Archive uploads with DB backup timestamps:

```bash
tar -czf backups/uploads/uploads-$(date +%F).tar.gz public/uploads
```

PowerShell example:

```powershell
Compress-Archive -Path public/uploads -DestinationPath backups/uploads/uploads-$(Get-Date -Format yyyy-MM-dd).zip
```

## Recommended Retention

- Keep daily DB backups for 30 days.
- Keep monthly DB backups for 12 months.
- Keep one immutable/offline copy.
- Run restore drills quarterly.
