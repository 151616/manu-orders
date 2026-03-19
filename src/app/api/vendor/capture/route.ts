import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Vendor capture route — Prisma removed. Will be rebuilt with Firestore.

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ capture: null }, { status: 200 });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json(
    { error: "This feature is being rebuilt." },
    { status: 503 },
  );
}
