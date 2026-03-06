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

## Access Code Login Hardening
- Login uses shared access codes and signed session claims (`VIEWER` or `ADMIN`).
- Login responses for bad credentials are generic: `Invalid access code.`
- `/login` and `/elevate` are rate-limited using DB-backed `LoginAttempt` records.
- Lockout/cooldown policy is per-IP and per-scope:
  - 8 failed attempts in a 10-minute window trigger cooldown.

## Soft Delete Safety
- `Order` and `Bookmark` use soft delete (`isDeleted`) to prevent immediate data loss.
- Default list/read queries exclude deleted rows.
- Admins can restore from trash or permanently delete from dedicated actions.

## Audit Log
- `OrderActivity` stores audit events with `id`, `orderId`, `at`, `role`, `action`, and `details`.
- Order create/update/delete/restore and bookmark create/update/delete/restore/permanent-delete events are logged.

## Authorization Guarantees
- `VIEWER` cannot mutate even with crafted requests.
- All create/update/delete server actions call `requireAdmin()` first.
- Unauthorized mutation attempts resolve to HTTP 403 via `forbidden()`.

## Vendor URL Extraction Hardening
- `POST /api/vendor/embed-check` and `POST /api/product-preview` require an authenticated `ADMIN` session.
- URL fetches only allow `http`/`https`.
- Localhost, `.local`, and private IP ranges are blocked (SSRF guard).
- Fetches use strict timeouts and bounded HTML size.
- Embed mode checks inspect `X-Frame-Options` and CSP `frame-ancestors` before attempting in-app iframe mode.

## Extension Capture Stub Security (v2 Foundation)
- `POST /api/vendor/capture` is `ADMIN`-only and validates request shape with Zod.
- Capture attempts are rate-limited by IP (`vendor_capture` scope).
- Invalid payloads are rejected with safe errors; endpoint currently returns `501` by design.

## Required Environment Variables
- `SESSION_SECRET`
- `SESSION_ISSUER` (default in `.env.example`: `manuqueue-app`)
- `SESSION_AUDIENCE` (default in `.env.example`: `manuqueue-users`)
- `TEAM_ACCESS_CODE`
- `TEAM_ADMIN_CODE` (fallback accepted: `TEAM_MANU_CODE`)

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
   - Try invalid access codes for both `VIEWER` and `ADMIN`.
   - Confirm both return the same `Invalid access code.` message.
7. Login rate-limit check:
   - From one IP, submit 8+ failed `/login` attempts inside 10 minutes.
   - Confirm further attempts return `Too many login attempts. Please try again later.`
8. Elevate rate-limit check:
   - Sign in as `VIEWER` and submit 8+ failed `/elevate` attempts inside 10 minutes.
   - Confirm further attempts return `Too many elevation attempts. Please try again later.`
9. Soft delete check:
   - As `ADMIN`, move an order and bookmark to trash.
   - Confirm they disappear from default queue/bookmark lists.
10. Restore/permanent delete check:
   - Restore each item from trash and confirm it reappears.
   - Move to trash again and permanently delete; confirm it no longer appears and cannot be restored.
11. SSRF guard check for vendor endpoints:
    - As `ADMIN`, call `/api/product-preview` with `http://127.0.0.1` and with `http://localhost`.
    - Confirm both are rejected with 400-level errors.
12. Embed fallback check:
    - Use a vendor URL known to block iframe embedding.
    - Confirm `/orders/new` switches to external mode and still allows `Next: Extract`.
