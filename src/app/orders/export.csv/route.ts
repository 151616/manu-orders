import { getSession } from "@/lib/auth";

// CSV export route — Prisma removed. Will be rebuilt with Firestore.

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("This feature is being rebuilt.", { status: 503 });
}
