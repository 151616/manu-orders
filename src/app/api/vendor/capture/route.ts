import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  isAuthAttemptRateLimited,
  normalizeLoginEmail,
  recordAuthAttempt,
} from "@/lib/login-rate-limit";

const captureRequestSchema = z.object({
  contractVersion: z.literal("v1"),
  source: z.literal("browser-extension"),
  vendorDomain: z.string().trim().min(1).max(200),
  pageUrl: z.string().trim().min(1).max(500),
  capturedAt: z.string().trim().min(1).max(100),
  selectedItems: z
    .array(
      z.object({
        title: z.string().trim().max(200).optional(),
        sku: z.string().trim().max(120).optional(),
        quantity: z.number().int().min(1).max(10000).optional(),
        unitPrice: z.number().min(0).max(1_000_000).optional(),
      }),
    )
    .max(200)
    .optional(),
});

function getRequestIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const ipAddress = getRequestIpAddress(request);
  const rateLimited = await isAuthAttemptRateLimited({
    scope: "vendor_capture",
    ipAddress,
  });
  if (rateLimited) {
    return NextResponse.json(
      { error: "Too many capture attempts. Please try again later." },
      { status: 429 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const parsed = captureRequestSchema.safeParse(payload);
  const captureKey = normalizeLoginEmail(`capture:${session.label}`);
  if (!parsed.success) {
    await recordAuthAttempt({
      scope: "vendor_capture",
      key: captureKey,
      ipAddress,
      success: false,
    });
    return NextResponse.json(
      {
        error: "Invalid capture payload.",
        contractVersion: "v1",
      },
      { status: 400 },
    );
  }

  await recordAuthAttempt({
    scope: "vendor_capture",
    key: captureKey,
    ipAddress,
    success: true,
  });

  return NextResponse.json(
    {
      error: "Extension capture is not enabled yet.",
      contractVersion: "v1",
      acceptedShape: {
        source: "browser-extension",
        vendorDomain: "string",
        pageUrl: "string",
        capturedAt: "ISO datetime string",
        selectedItems: "optional item array",
      },
    },
    { status: 501 },
  );
}
