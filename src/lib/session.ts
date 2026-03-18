import { JWTPayload, jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "manuqueue_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_ISSUER =
  process.env.SESSION_ISSUER ?? "manuqueue-app";
export const SESSION_AUDIENCE =
  process.env.SESSION_AUDIENCE ?? "manuqueue-users";
const SESSION_ALGORITHMS = ["HS256"];

export const USER_ROLES = ["MEMBER", "ADMIN"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export type SessionPayload = JWTPayload & {
  userId: string;
  role: UserRoleValue;
  name: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken({
  userId,
  role,
  name,
}: {
  userId: string;
  role: UserRoleValue;
  name: string;
}) {
  const jti = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  return new SignJWT({ userId, role, name })
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
      !USER_ROLES.includes(payload.role as UserRoleValue)
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
