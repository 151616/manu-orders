import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const MAX_HTML_BYTES = 1_500_000;

function normalizeUrlInput(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("URL is required.");
  }

  if (URL_SCHEME_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

function isPrivateIpv4(ip: string) {
  const segments = ip.split(".").map((segment) => Number.parseInt(segment, 10));
  if (segments.length !== 4 || segments.some((segment) => Number.isNaN(segment))) {
    return true;
  }

  const [a, b] = segments;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

function firstIpv6Segment(ip: string) {
  const normalized = ip.toLowerCase();
  const pieces = normalized.split(":").filter((piece) => piece.length > 0);
  if (pieces.length === 0) {
    return 0;
  }

  const parsed = Number.parseInt(pieces[0] ?? "", 16);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") {
    return true;
  }

  const first = firstIpv6Segment(normalized);
  if ((first & 0xfe00) === 0xfc00) {
    return true;
  }
  if ((first & 0xffc0) === 0xfe80) {
    return true;
  }

  return false;
}

function isPrivateOrLocalIp(ip: string) {
  const ipType = isIP(ip);
  if (ipType === 4) {
    return isPrivateIpv4(ip);
  }
  if (ipType === 6) {
    return isPrivateIpv6(ip);
  }
  return true;
}

export function parseAndNormalizeVendorUrl(rawUrl: string) {
  const normalized = normalizeUrlInput(rawUrl);
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs are supported.");
  }

  return parsed;
}

export async function assertPublicVendorTarget(url: URL) {
  const hostname = url.hostname.trim().toLowerCase();

  if (!hostname) {
    throw new Error("URL hostname is required.");
  }

  if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local hostnames are not allowed.");
  }

  const ipType = isIP(hostname);
  if (ipType !== 0) {
    if (isPrivateOrLocalIp(hostname)) {
      throw new Error("Private network addresses are not allowed.");
    }
    return;
  }

  let resolved;
  try {
    resolved = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Could not resolve target hostname.");
  }

  if (!resolved || resolved.length === 0) {
    throw new Error("Could not resolve target hostname.");
  }

  for (const record of resolved) {
    if (isPrivateOrLocalIp(record.address)) {
      throw new Error("Private network targets are not allowed.");
    }
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function readHtmlWithLimit(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Target did not return an HTML page.");
  }

  if (!response.body) {
    const text = await response.text();
    if (text.length > MAX_HTML_BYTES) {
      throw new Error("Response body is too large.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    total += chunk.value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Response body is too large.");
    }

    html += decoder.decode(chunk.value, { stream: true });
  }

  html += decoder.decode();
  return html;
}

export function detectFrameEmbeddingBlock(headers: Headers) {
  const xFrameOptions = (headers.get("x-frame-options") ?? "").toLowerCase();
  if (
    xFrameOptions.includes("deny") ||
    xFrameOptions.includes("sameorigin")
  ) {
    return {
      embeddable: false,
      reason: "Vendor blocks embedding with X-Frame-Options.",
    };
  }

  const csp = headers.get("content-security-policy") ?? "";
  const frameAncestorsDirective = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (!frameAncestorsDirective) {
    return {
      embeddable: true,
      reason: "No frame-ancestor restrictions detected.",
    };
  }

  const directiveValue = frameAncestorsDirective
    .slice("frame-ancestors".length)
    .trim()
    .toLowerCase();

  if (!directiveValue || directiveValue.includes("'none'")) {
    return {
      embeddable: false,
      reason: "Vendor blocks embedding with CSP frame-ancestors.",
    };
  }

  if (
    directiveValue.includes("*") ||
    directiveValue.includes("https:") ||
    directiveValue.includes("http:")
  ) {
    return {
      embeddable: true,
      reason: "CSP frame-ancestors appears to allow embedding.",
    };
  }

  return {
    embeddable: false,
    reason: "Vendor frame-ancestors policy likely blocks embedding.",
  };
}
