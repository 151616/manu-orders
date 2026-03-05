# ManuQueue

ManuQueue is a responsive Next.js app skeleton for manufacturing order intake and queue tracking.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (local development)
- Zod validation
- Shared team access-code auth with signed cookie sessions

## Setup Commands

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
copy .env.example .env
```

Set access codes in `.env`:

```bash
TEAM_ACCESS_CODE=your-viewer-code
TEAM_ADMIN_CODE=your-admin-code
```

3. Create and apply migration:

```bash
npx prisma migrate dev --name init
```

4. Seed demo data:

```bash
npx prisma db seed
```

5. Start local development:

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

Unauthenticated users are redirected to `/login`.

## Server Auth Helpers

- `getSession()`
- `requireAuth()`
- `requireRole("ADMIN")`
- `requireAdmin()`

## Ops Runbook

- Backup/restore procedures (SQLite + Postgres examples): `docs/ops.md`
- Backup command: `npm run db:backup`
- Restore command: `npm run db:restore -- --archive <path-to-zip>`
