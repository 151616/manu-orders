# Security Notes

This project uses signed JWT session cookies.

## Session/Cookie Behavior
- Cookie name: `manuqueue_session`
- Flags:
  - `HttpOnly`
  - `Secure` when `NODE_ENV=production`
  - `SameSite=Lax`
  - `Path=/`
  - `Max-Age` set to 7 days
- JWT:
  - Signed with `HS256`
  - Includes `exp`, `iss`, `aud`, and `jti`
  - Verification enforces algorithm allowlist (`HS256`) and validates signature, expiry, issuer, and audience

## Password and Login Hardening
- Passwords are stored only in `User.passwordHash` (bcrypt), never plaintext.
- Seed and upgrades use bcrypt cost factor `12` (minimum accepted is `10`).
- Login responses for bad email/password are generic: `Invalid credentials.`
- Login is rate-limited using DB-backed `LoginAttempt` records:
  - Per-IP failed attempt limit (15-minute window)
  - Per-email failed attempt limit (15-minute window)

## Required Environment Variables
- `SESSION_SECRET`
- `SESSION_ISSUER` (default in `.env.example`: `manuqueue-app`)
- `SESSION_AUDIENCE` (default in `.env.example`: `manuqueue-users`)

## Verification Steps
1. Start the app and log in.
2. In browser devtools (`Application`/`Storage` -> `Cookies`), inspect `manuqueue_session`:
   - Confirm `HttpOnly=true`, `SameSite=Lax`, `Path=/`, and an expiry/max-age is present.
3. Production flag check:
   - Run with `NODE_ENV=production` and inspect `Set-Cookie` response headers from `/login`.
   - Confirm `Secure` is present.
4. Session rotation check:
   - Log in once and copy the cookie value.
   - Log out, then log in again.
   - Confirm the new cookie value differs from the previous one.
5. Logout clear check:
   - Click logout.
   - Confirm `manuqueue_session` is removed (or expired immediately) in browser cookie storage.
6. Generic login error check:
   - Try a nonexistent email and a real email with wrong password.
   - Confirm both return the same `Invalid credentials.` message.
7. Rate limit check:
   - Submit repeated failed logins for one email (8+ failures within 15 minutes).
   - Confirm further attempts return `Too many login attempts. Please try again later.`
   - Repeat using varying emails from one IP (20+ failures within 15 minutes) and confirm rate limiting still triggers.
