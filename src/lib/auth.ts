import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type PermissionLevel,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  hasPermission,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";

/* ------------------------------------------------------------------ */
/*  AuthUser — the shape available everywhere after login              */
/* ------------------------------------------------------------------ */

/** Legacy binary role — kept for backwards compatibility while pages are rebuilt. */
export type UserRoleValue = "MEMBER" | "ADMIN";

export type AuthUser = {
  /** Firestore doc ID (= user_id). */
  id: string;
  /** Display name (nickname). */
  name: string;
  /** Numeric permission level 1-5. */
  permissionLevel: PermissionLevel;
  /** Free-text position. */
  position: string;

  /* ── Backwards-compatible fields (used by existing pages) ────────── */
  /** Binary role derived from permission level. Level 1-3 = ADMIN, 4-5 = MEMBER. */
  role: UserRoleValue;
  /** Display label like "ADMIN:John". */
  label: string;
};

/* ------------------------------------------------------------------ */
/*  Cookie helpers                                                    */
/* ------------------------------------------------------------------ */

function getSessionCookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSession(
  user: Pick<AuthUser, "id" | "name" | "permissionLevel" | "position">,
) {
  const token = await signSessionToken({
    userId: user.id,
    name: user.name,
    permissionLevel: user.permissionLevel,
    position: user.position,
  });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...getSessionCookieBase(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieBase(),
    maxAge: 0,
    expires: new Date(0),
  });
}

/* ------------------------------------------------------------------ */
/*  Session readers                                                   */
/* ------------------------------------------------------------------ */

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const role: UserRoleValue = payload.permissionLevel <= 3 ? "ADMIN" : "MEMBER";
  return {
    id: payload.userId,
    name: payload.name,
    permissionLevel: payload.permissionLevel,
    position: payload.position ?? "",
    role,
    label: `${role}:${payload.name}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Guards                                                            */
/* ------------------------------------------------------------------ */

/** Redirect to /login if not authenticated. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a minimum permission level.
 * Lower number = higher privilege, so `requireLevel(3)` allows 1, 2, 3.
 */
export async function requireLevel(level: PermissionLevel): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user.permissionLevel, level)) {
    redirect("/queue");
  }
  return user;
}

/** Require Level 1 (Admin). */
export async function requireAdmin(): Promise<AuthUser> {
  return requireLevel(1);
}

/** Require at least Upper Leadership (Level 2). */
export async function requireUpperLeadership(): Promise<AuthUser> {
  return requireLevel(2);
}

/** Require at least Lower Leadership (Level 3). */
export async function requireLeadership(): Promise<AuthUser> {
  return requireLevel(3);
}

/** Require at least approved member (Level 4). Not pending. */
export async function requireApproved(): Promise<AuthUser> {
  return requireLevel(4);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return getSession();
}
