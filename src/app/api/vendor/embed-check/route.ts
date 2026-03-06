import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  assertPublicVendorTarget,
  detectFrameEmbeddingBlock,
  fetchWithTimeout,
  parseAndNormalizeVendorUrl,
} from "@/lib/vendor-web";

const requestSchema = z.object({
  url: z.string().trim().min(1).max(500),
});

const FETCH_TIMEOUT_MS = 6000;

type EmbedCheckResponse = {
  normalizedUrl: string;
  finalUrl: string;
  mode: "iframe" | "external";
  embeddable: boolean;
  reason: string;
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const parsedRequest = requestSchema.safeParse(payload);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Please provide a valid URL." },
      { status: 400 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = parseAndNormalizeVendorUrl(parsedRequest.data.url);
    await assertPublicVendorTarget(targetUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL." },
      { status: 400 },
    );
  }

  try {
    const response = await fetchWithTimeout(
      targetUrl.toString(),
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent": "ManuQueue-EmbedCheck/1.0",
          Accept: "text/html,application/xhtml+xml",
          Range: "bytes=0-2048",
        },
      },
      FETCH_TIMEOUT_MS,
    );

    const finalUrl = new URL(response.url || targetUrl.toString());
    const frameCheck = detectFrameEmbeddingBlock(response.headers);
    void response.body?.cancel().catch(() => undefined);

    const result: EmbedCheckResponse = {
      normalizedUrl: targetUrl.toString(),
      finalUrl: finalUrl.toString(),
      mode: frameCheck.embeddable ? "iframe" : "external",
      embeddable: frameCheck.embeddable,
      reason: frameCheck.reason,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const fallback: EmbedCheckResponse = {
      normalizedUrl: targetUrl.toString(),
      finalUrl: targetUrl.toString(),
      mode: "external",
      embeddable: false,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "Timed out while checking embed policy. Using external mode."
          : "Could not verify embed policy. Using external mode.",
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
