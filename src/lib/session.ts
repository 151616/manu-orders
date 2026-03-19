import { JWTPayload, jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "manuqueue_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_ISSUER =
  process.env.SESSION_ISSUER ?? "manuqueue-app";
export const SESSION_AUDIENCE =
  process.env.SESSION_AUDIENCE ?? "manuqueue-users";
const SESSION_ALGORITHMS = ["HS256"];

/* ------------------------------------------------------------------ */
/*  Permission levels (numeric, lower = more power)                   */
/* ------------------------------------------------------------------ */

/**
 * 1 = Admin (highest on-site user)
 * 2 = Upper Leadership
 * 3 = Lower Leadership
 * 4 = Approved Member
 * 5 = Pending / Unapproved
 *
 * Level 0 (Owner) is NOT represented in code — it means direct
 * Firebase console access.
 */
export type PermissionLevel = 1 | 2 | 3 | 4 | 5;

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  1: "Admin",
  2: "Upper Leadership",
  3: "Lower Leadership",
  4: "Member",
  5: "Pending",
};

/** Returns true when the user's level is at least as powerful as `required`. */
export function hasPermission(
  userLevel: number,
  required: PermissionLevel,
): boolean {
  return userLevel >= 1 && userLevel <= required;
}

/* ------------------------------------------------------------------ */
/*  Session payload                                                   */
/* ------------------------------------------------------------------ */

export type SessionPayload = JWTPayload & {
  /** Firestore document ID (= user_id). */
  userId: string;
  /** Display name (nickname). */
  name: string;
  /** Numeric permission level 1-5. */
  permissionLevel: PermissionLevel;
  /** Free-text position. */
  position: string;
};

/* ------------------------------------------------------------------ */
/*  Token helpers                                                     */
/* ------------------------------------------------------------------ */

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken({
  userId,
  name,
  permissionLevel,
  position,
}: {
  userId: string;
  name: string;
  permissionLevel: PermissionLevel;
  position: string;
}) {
  const jti =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  return new SignJWT({ userId, name, permissionLevel, position })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: SESSION_ALGORITHMS,
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.permissionLevel !== "number" ||
      payload.permissionLevel < 1 ||
      payload.permissionLevel > 5
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
