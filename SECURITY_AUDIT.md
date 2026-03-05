# ManuQueue Security Audit (Auth + Authorization)

Date: 2026-03-05  
Scope: Next.js App Router auth/session/middleware, login flow, server actions for orders/bookmarks, Prisma client/config.

## 1) Threat Model
### Assets to protect
- User passwords (`User.passwordHash`) and login flow.
- Session integrity/confidentiality (`manuqueue_session` JWT cookie).
- Order and bookmark data (including activity logs and vendor links).
- Role-restricted write operations (manufacturing-only fields/actions).

### Primary threat actors
- Unauthenticated internet users attempting account takeover.
- Authenticated low-privilege users attempting unauthorized writes.
- Cross-site attackers attempting CSRF against authenticated users.
- Malicious internal users storing payloads that execute in other users' browsers.

### Security objectives
- Only valid users can authenticate.
- Session tokens cannot be forged or misused.
- Role and ownership checks are enforced server-side on every write.
- User-supplied content cannot be used to execute script or abuse privileged context.

## 2) Findings

## Critical
- None identified in current scope.

## High

### H1: Dangerous URL schemes accepted and rendered as clickable links
- Where:
  - [`src/lib/schemas.ts`](./src/lib/schemas.ts) (`orderUrl` and `defaultOrderUrl` use `z.url(...)`).
  - [`src/app/orders/[id]/page.tsx`](./src/app/orders/[id]/page.tsx) renders `order.orderUrl` as clickable link.
- Why it matters:
  - `z.url()` accepts non-HTTP schemes such as `javascript:`, `data:`, `file:`, etc.
  - Stored malicious URLs can lead to script execution/social engineering when clicked by authenticated users.
- Recommended fix:
  - Enforce protocol allowlist (`http:`/`https:` only) in Zod refinements.
  - Normalize URLs before storing (canonical parse + serialize).
  - Optionally reject localhost/private-network targets if not required.

### H2: No brute-force/rate-limiting controls on login
- Where:
  - [`src/app/login/actions.ts`](./src/app/login/actions.ts) `loginAction`.
- Why it matters:
  - Unlimited attempts enable credential stuffing/password guessing.
  - Repeated attacks can degrade availability and increase account takeover risk.
- Recommended fix:
  - Add per-IP and per-account rate limiting + temporary lockout/backoff.
  - Add structured security logging for failed attempts.
  - Consider CAPTCHA/challenge after threshold.

## Medium

### M1: CSRF protections rely primarily on SameSite cookie behavior
- Where:
  - Session cookie is `sameSite: "lax"` in [`src/lib/auth.ts`](./src/lib/auth.ts).
  - State-changing server actions in [`src/app/orders/actions.ts`](./src/app/orders/actions.ts) and [`src/app/bookmarks/actions.ts`](./src/app/bookmarks/actions.ts).
- Why it matters:
  - SameSite=Lax is helpful but not equivalent to explicit CSRF defense-in-depth.
  - If browser behavior changes or endpoints are exposed unexpectedly, write actions may be at risk.
- Recommended fix:
  - Add explicit CSRF tokens and/or strict origin checks on mutating actions.
  - Prefer `SameSite=Strict` if workflow allows.

### M2: Session revocation model is weak (stateless JWT only)
- Where:
  - Token issuance/verification in [`src/lib/session.ts`](./src/lib/session.ts).
  - User resolution in [`src/lib/auth.ts`](./src/lib/auth.ts).
- Why it matters:
  - A stolen token remains valid until expiry (7 days), even after password change (unless account deleted).
  - No session version/denylist for immediate invalidation.
- Recommended fix:
  - Add server-side session tracking (`sessionVersion`/session table) and validate it on each request.
  - Rotate tokens more frequently; consider shorter max age + refresh flow.

### M3: Authorization failure path throws generic error instead of explicit 403 handling
- Where:
  - [`src/lib/auth.ts`](./src/lib/auth.ts) `requireRole` throws `new Error("Forbidden")`.
- Why it matters:
  - Unauthorized requests produce generic server errors rather than explicit forbidden responses.
  - This complicates monitoring and can leak implementation behavior in logs.
- Recommended fix:
  - Return structured `403` responses for actions/routes.
  - Standardize forbidden error handling and audit logging.

### M4: Role model gives REQUESTER broad write scope across all orders (by current design)
- Where:
  - [`src/app/orders/actions.ts`](./src/app/orders/actions.ts) `updateOrderRequesterFields` has auth-only check, no ownership scoping.
- Why it matters:
  - Any authenticated requester can modify requester-editable fields on any order.
  - If business intent later shifts to per-owner isolation, this becomes an access-control gap.
- Recommended fix:
  - If intended behavior is per-owner editing, add owner relation and enforce ownership checks server-side.
  - If current behavior is intentional, document it clearly as an accepted risk.

## Low

### L1: Login path may allow timing-based user enumeration
- Where:
  - [`src/app/login/actions.ts`](./src/app/login/actions.ts) returns early when user not found.
- Why it matters:
  - Response timing can differ between "user not found" and "password mismatch".
- Recommended fix:
  - Perform constant-time dummy hash comparison on missing users.

### L2: Missing explicit security response headers
- Where:
  - [`next.config.ts`](./next.config.ts) has no `headers()` hardening.
- Why it matters:
  - Defaults may be insufficient for clickjacking/content injection defense-in-depth.
- Recommended fix:
  - Add headers such as `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`.

### L3: Secret quality not enforced at startup
- Where:
  - [`src/lib/session.ts`](./src/lib/session.ts) checks only presence of `SESSION_SECRET`.
  - [`.env.example`](./.env.example) uses placeholder secret text.
- Why it matters:
  - Weak production secrets reduce JWT signing security.
- Recommended fix:
  - Enforce minimum entropy/length requirements and fail startup if weak.
  - Document secure generation requirements.

## 3) Verification Checklist (Local)
- [ ] URL validation hardening test:
  - Try setting `orderUrl`/`defaultOrderUrl` to `javascript:alert(1)` and `data:text/html,...`.
  - Confirm validation rejects non-HTTP(S) schemes.
- [ ] Brute-force controls:
  - Attempt repeated invalid logins (>20 attempts quickly).
  - Confirm throttling/lockout and security logs.
- [ ] CSRF test:
  - From a different origin, submit crafted POST/form against mutating actions.
  - Confirm request is blocked (token/origin enforcement), not merely dependent on browser cookie behavior.
- [ ] Authorization behavior:
  - As REQUESTER, attempt manufacturing update action directly.
  - Confirm explicit `403` behavior and no DB change.
- [ ] Session revocation:
  - Log in, capture cookie, change password/role, replay old cookie.
  - Confirm old session is rejected immediately if revocation is implemented.
- [ ] Headers:
  - Inspect response headers for CSP/frame/content-type protections.

