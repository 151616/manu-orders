import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { ORDER_CATEGORIES, type OrderCategory } from "@/lib/order-domain";
import {
  assertPublicVendorTarget,
  fetchWithTimeout,
  parseAndNormalizeVendorUrl,
  readHtmlWithLimit,
} from "@/lib/vendor-web";

const requestSchema = z.object({
  url: z.string().trim().min(1).max(500),
});

const FETCH_TIMEOUT_MS = 8000;

type ExtractionSource = "jsonld" | "meta" | "rev-heuristic" | "mixed";
type ExtractionConfidence = "high" | "medium" | "low";

type AutofillPayload = {
  normalizedUrl: string;
  title: string;
  description: string;
  vendor: string;
  category: OrderCategory;
  source: ExtractionSource;
  confidence: ExtractionConfidence;
};

function decodeHtml(text: string | null | undefined) {
  if (!text) {
    return "";
  }

  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizeWhitespace(value: string | null | undefined) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return normalizeWhitespace(value);
    }
  }
  return "";
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeWhitespace(match?.[1]);
}

function extractHeadingOne(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return normalizeWhitespace(match?.[1]);
}

function parseTagAttributes(tagText: string) {
  const attributes = new Map<string, string>();
  const attrRegex = /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match = attrRegex.exec(tagText);

  while (match) {
    const key = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (key) {
      attributes.set(key, value);
    }
    match = attrRegex.exec(tagText);
  }

  return attributes;
}

function extractMetaByKey(
  html: string,
  keyType: "name" | "property" | "itemprop",
  keyValue: string,
) {
  const metaRegex = /<meta\s+[^>]*>/gi;
  let match = metaRegex.exec(html);

  while (match) {
    const attributes = parseTagAttributes(match[0]);
    const key = attributes.get(keyType);
    const content = attributes.get("content");

    if (key?.toLowerCase() === keyValue.toLowerCase() && content) {
      return normalizeWhitespace(content);
    }
    match = metaRegex.exec(html);
  }

  return "";
}

function isProductType(value: unknown): boolean {
  if (typeof value === "string") {
    return value.toLowerCase().includes("product");
  }

  if (Array.isArray(value)) {
    return value.some((entry) => isProductType(entry));
  }

  return false;
}

function findFirstProductNode(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findFirstProductNode(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const node = input as Record<string, unknown>;
  if (isProductType(node["@type"])) {
    return node;
  }

  if (Array.isArray(node["@graph"])) {
    const found = findFirstProductNode(node["@graph"]);
    if (found) {
      return found;
    }
  }

  for (const value of Object.values(node)) {
    const found = findFirstProductNode(value);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractJsonLdProduct(html: string) {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = scriptRegex.exec(html);

  while (match) {
    const raw = match[1]?.trim();
    if (!raw) {
      match = scriptRegex.exec(html);
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const productNode = findFirstProductNode(parsed);

      if (productNode) {
        const brandValue = productNode.brand;
        const brandName =
          typeof brandValue === "string"
            ? brandValue
            : brandValue &&
                typeof brandValue === "object" &&
                "name" in brandValue &&
                typeof (brandValue as { name?: unknown }).name === "string"
              ? ((brandValue as { name: string }).name ?? "")
              : "";

        return {
          title: firstString([productNode.name]),
          description: firstString([productNode.description]),
          vendor: firstString([brandName, productNode.manufacturer]),
          category: firstString([productNode.category]),
          found: true,
        };
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }

    match = scriptRegex.exec(html);
  }

  return {
    title: "",
    description: "",
    vendor: "",
    category: "",
    found: false,
  };
}

function vendorFromHostname(hostname: string) {
  const host = hostname.replace(/^www\./i, "");
  const firstSegment = host.split(".")[0] ?? "";
  if (!firstSegment) {
    return "";
  }

  const lower = firstSegment.toLowerCase();
  if (lower === "revrobotics") {
    return "REV Robotics";
  }

  return firstSegment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveCategory(raw: string) {
  const text = raw.toLowerCase();

  if (
    text.includes("3d") ||
    text.includes("print") ||
    text.includes("pla") ||
    text.includes("abs")
  ) {
    return "PRINT_3D" as const;
  }

  if (text.includes("laser")) {
    return "LASER" as const;
  }

  if (
    text.includes("wire") ||
    text.includes("motor") ||
    text.includes("sensor") ||
    text.includes("electrical") ||
    text.includes("electronics") ||
    text.includes("battery") ||
    text.includes("controller")
  ) {
    return "ELECTRICAL" as const;
  }

  if (
    text.includes("cnc") ||
    text.includes("machin") ||
    text.includes("milling") ||
    text.includes("lathe")
  ) {
    return "CNC" as const;
  }

  if (text.includes("assembly") || text.includes("kit")) {
    return "ASSEMBLY" as const;
  }

  return "OTHER" as const;
}

function applyRevHeuristics({
  hostname,
  pathname,
  html,
  title,
  description,
  vendor,
  categoryText,
}: {
  hostname: string;
  pathname: string;
  html: string;
  title: string;
  description: string;
  vendor: string;
  categoryText: string;
}) {
  if (!hostname.toLowerCase().includes("revrobotics")) {
    return {
      title,
      description,
      vendor,
      categoryText,
      used: false,
    };
  }

  const pathText = pathname.replace(/[-_/]+/g, " ");
  const revTitle = firstString([
    extractMetaByKey(html, "property", "og:title"),
    extractHeadingOne(html),
    extractTitleTag(html),
  ]);
  const revDescription = firstString([
    extractMetaByKey(html, "property", "og:description"),
    extractMetaByKey(html, "name", "description"),
    description,
  ]);

  return {
    title: revTitle || title,
    description: revDescription || description,
    vendor: "REV Robotics",
    categoryText: [categoryText, pathText, revTitle, revDescription]
      .filter(Boolean)
      .join(" "),
    used: true,
  };
}

function resolveSourceAndConfidence({
  usedJsonLd,
  usedMeta,
  usedRev,
  title,
  vendor,
  description,
}: {
  usedJsonLd: boolean;
  usedMeta: boolean;
  usedRev: boolean;
  title: string;
  vendor: string;
  description: string;
}) {
  let source: ExtractionSource = "meta";
  if (usedRev && (usedJsonLd || usedMeta)) {
    source = "mixed";
  } else if (usedRev) {
    source = "rev-heuristic";
  } else if (usedJsonLd && usedMeta) {
    source = "mixed";
  } else if (usedJsonLd) {
    source = "jsonld";
  }

  let confidence: ExtractionConfidence = "low";
  if ((usedJsonLd || usedRev) && title && vendor) {
    confidence = "high";
  } else if ((title && vendor) || (title && description)) {
    confidence = "medium";
  }

  return { source, confidence };
}

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
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "ManuQueue-Autofill/1.1",
        },
      },
      FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch page (HTTP ${response.status}).` },
        { status: 422 },
      );
    }

    const html = await readHtmlWithLimit(response);
    const finalUrl = new URL(response.url || targetUrl.toString());

    const jsonLd = extractJsonLdProduct(html);
    const metaTitle = firstString([
      extractMetaByKey(html, "property", "og:title"),
      extractMetaByKey(html, "name", "twitter:title"),
      extractMetaByKey(html, "name", "title"),
      extractMetaByKey(html, "itemprop", "name"),
      extractHeadingOne(html),
      extractTitleTag(html),
    ]);
    const metaDescription = firstString([
      extractMetaByKey(html, "property", "og:description"),
      extractMetaByKey(html, "name", "description"),
      extractMetaByKey(html, "itemprop", "description"),
    ]);
    const metaVendor = firstString([
      extractMetaByKey(html, "name", "author"),
      extractMetaByKey(html, "property", "og:site_name"),
      extractMetaByKey(html, "name", "application-name"),
    ]);

    const baseTitle = firstString([jsonLd.title, metaTitle]);
    const baseDescription = firstString([jsonLd.description, metaDescription]);
    const baseVendor = firstString([jsonLd.vendor, metaVendor]);
    const baseCategoryText = firstString([
      jsonLd.category,
      extractMetaByKey(html, "property", "product:category"),
    ]);

    const revAdjusted = applyRevHeuristics({
      hostname: finalUrl.hostname,
      pathname: finalUrl.pathname,
      html,
      title: baseTitle,
      description: baseDescription,
      vendor: baseVendor,
      categoryText: baseCategoryText,
    });

    const title = revAdjusted.title.slice(0, 120);
    const description = revAdjusted.description.slice(0, 2000);
    const vendor = (revAdjusted.vendor || vendorFromHostname(finalUrl.hostname)).slice(
      0,
      200,
    );
    const inferredCategory = deriveCategory(
      [
        revAdjusted.categoryText,
        title,
        description,
        vendor,
        finalUrl.pathname.replace(/[-_/]+/g, " "),
      ].join(" "),
    );
    const category = ORDER_CATEGORIES.includes(inferredCategory)
      ? inferredCategory
      : "OTHER";

    if (!title && !description && !vendor) {
      return NextResponse.json(
        { error: "No product metadata found on this page." },
        { status: 422 },
      );
    }

    const { source, confidence } = resolveSourceAndConfidence({
      usedJsonLd: jsonLd.found,
      usedMeta: Boolean(metaTitle || metaDescription || metaVendor),
      usedRev: revAdjusted.used,
      title,
      vendor,
      description,
    });

    const result: AutofillPayload = {
      normalizedUrl: finalUrl.toString(),
      title,
      description,
      vendor,
      category,
      source,
      confidence,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Fetching product info timed out. Please try again." },
        { status: 504 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch product information.";
    const status =
      message.toLowerCase().includes("too large") ||
      message.toLowerCase().includes("html")
        ? 422
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
