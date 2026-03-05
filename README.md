# ManuQueue

ManuQueue is a responsive Next.js app for manufacturing order intake and queue tracking.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- Zod validation
- Shared team access-code auth with signed cookie sessions
- Attachment storage drivers:
  - `local` (dev fallback, writes to `public/uploads`)
  - `firebase` (Firebase Storage via `firebase-admin`)

## Setup Commands

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
copy .env.example .env
```

Set access codes and `DATABASE_URL` in `.env`.

3. Run PostgreSQL locally (example with Docker):

```bash
docker run --name manuqueue-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=manuqueue -p 5432:5432 -d postgres:16
```

4. Apply migrations:

```bash
npx prisma migrate dev
```

5. Seed demo data:

```bash
npx prisma db seed
```

6. Start local development:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Login Method

- `/login` uses a role selector plus one code input.
- `VIEWER` login checks only `TEAM_ACCESS_CODE`.
- `ADMIN` login checks only `TEAM_ADMIN_CODE` (fallback: `TEAM_MANU_CODE`).
- Logged-in viewers can use `/elevate` to switch the current session to `ADMIN`.
- Sessions are JWT cookies and carry the selected role.

## Protected Routes

- `/queue`
- `/elevate`
- `/orders/new`
- `/orders/[id]`
- `/bookmarks`
- `/trash` (admin-only)

Unauthenticated users are redirected to `/login`.

## Server Auth Helpers

- `getSession()`
- `requireAuth()`
- `requireRole("ADMIN")`
- `requireAdmin()`

## Attachments

- Default local mode:
  - `ORDER_ATTACHMENT_STORAGE_DRIVER=local`
  - Files are stored under `public/uploads/orders`.
- Firebase mode:
  - `ORDER_ATTACHMENT_STORAGE_DRIVER=firebase`
  - Set `FIREBASE_STORAGE_BUCKET`.
  - Optional for non-Google local environments: set `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Firebase App Hosting Notes

- App Hosting requires a PostgreSQL `DATABASE_URL` (for example Cloud SQL Postgres).
- Use Firebase Storage driver in production:

```bash
ORDER_ATTACHMENT_STORAGE_DRIVER=firebase
FIREBASE_STORAGE_BUCKET=<your-bucket-name>
```

- Apply migrations in deploy/startup:

```bash
npx prisma migrate deploy
```

- Build command:

```bash
npm run build
```

## Ops Runbook

- Backup/restore procedures: `docs/ops.md`
