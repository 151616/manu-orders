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
TEAM_ACCESS_CODE=your-shared-team-code
TEAM_MANU_CODE=your-manufacturing-code
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

- `/login` uses a single `Team Access Code` input plus a role selector.
- `REQUESTER` login requires `TEAM_ACCESS_CODE`.
- `MANUFACTURING` login requires both `TEAM_ACCESS_CODE` and `TEAM_MANU_CODE`.
- Sessions are JWT cookies and carry the selected role.

## Protected Routes

- `/queue`
- `/orders/new`
- `/orders/[id]`
- `/bookmarks`

Unauthenticated users are redirected to `/login`.

## Server Auth Helpers

- `getCurrentUser()`
- `requireAuth()`
- `requireRole("MANUFACTURING")`
