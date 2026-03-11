import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  isAuthAttemptRateLimited,
  normalizeLoginEmail,
  recordAuthAttempt,
} from "@/lib/login-rate-limit";
/*  */import { prisma } from "@/lib/prisma";

const captureRequestSchema = z.object({
  contractVersion: z.literal("v1"),
  source: z.literal("browser-extension"),
  vendorDomain: z.string().trim().min(1).max(200),
  pageUrl: z.string().trim().url().max(500),
  capturedAt: z.string().datetime(),
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutErrorMessage: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function requireAdminSession() {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  if (session.role !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true as const, session };
}

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  let latestCapture = null;
  try {
    latestCapture = await withTimeout(
      prisma.vendorCapture.findFirst({
        where: {
          createdByLabel: auth.session.label,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      8000,
      "Capture lookup timed out.",
    );
  } catch {
    return NextResponse.json(
      { error: "Capture lookup is temporarily unavailable." },
      { status: 503 },
    );
  }

  if (!latestCapture) {
    return NextResponse.json({ capture: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      capture: {
        id: latestCapture.id,
        source: latestCapture.source,
        vendorDomain: latestCapture.vendorDomain,
        pageUrl: latestCapture.pageUrl,
        capturedAt: latestCapture.capturedAt.toISOString(),
        selectedItems: latestCapture.selectedItems,
        createdAt: latestCapture.createdAt.toISOString(),
      },
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }
  const { session } = auth;

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

  const capturedAt = new Date(parsed.data.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) {
    return NextResponse.json(
      {
        error: "Invalid capturedAt value.",
        contractVersion: "v1",
      },
      { status: 400 },
    );
  }

  let created;
  try {
    created = await withTimeout(
      prisma.vendorCapture.create({
        data: {
          createdByLabel: session.label,
          source: parsed.data.source,
          vendorDomain: parsed.data.vendorDomain,
          pageUrl: parsed.data.pageUrl,
          capturedAt,
          ...(parsed.data.selectedItems
            ? { selectedItems: parsed.data.selectedItems }
            : {}),
        },
      }),
      8000,
      "Capture save timed out.",
    );
  } catch {
    return NextResponse.json(
      { error: "Capture save is temporarily unavailable." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      contractVersion: "v1",
      capture: {
        id: created.id,
        vendorDomain: created.vendorDomain,
        pageUrl: created.pageUrl,
        capturedAt: created.capturedAt.toISOString(),
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
