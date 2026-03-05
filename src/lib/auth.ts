import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  UserRoleValue,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";

export type AuthUser = {
  id: string;
  role: UserRoleValue;
  name: string;
  label: string;
};

function getSessionCookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSession(
  user: Pick<AuthUser, "id" | "role" | "name">,
) {
  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    name: user.name,
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

function toSessionLabel(user: Pick<AuthUser, "role" | "name">) {
  return `${user.role}:${user.name}`;
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.userId,
    role: payload.role,
    name: payload.name,
    label: toSessionLabel({
      role: payload.role,
      name: payload.name,
    }),
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: UserRoleValue): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== role) {
    forbidden();
  }

  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("ADMIN");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return getSession();
}
