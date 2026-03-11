import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServiceAccount } from "firebase-admin";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const LOCAL_TRACKING_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
  "tracking",
);
const LOCAL_TRACKING_PREFIX = "/uploads/tracking/";
const GCS_STORAGE_PREFIX = "gcs:";

function getAttachmentStorageDriver(): "local" | "firebase" {
  const configured = process.env.ORDER_ATTACHMENT_STORAGE_DRIVER
    ?.trim()
    .toLowerCase();
  if (configured === "firebase") return "firebase";
  if (configured === "local") return "local";
  return process.env.NODE_ENV === "production" ? "firebase" : "local";
}

function getFirebaseStorageBucketName() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    null
  );
}

function getFirebaseAdminApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }
  const bucket = getFirebaseStorageBucketName();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const serviceAccount: ServiceAccount | null = raw
    ? (JSON.parse(raw) as ServiceAccount)
    : null;
  return initializeApp({
    ...(bucket ? { storageBucket: bucket } : {}),
    ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
  });
}

function getFirebaseBucket() {
  const bucketName = getFirebaseStorageBucketName();
  if (!bucketName) {
    throw new Error(
      "FIREBASE_STORAGE_BUCKET is required when using Firebase attachment storage.",
    );
  }
  const app = getFirebaseAdminApp();
  return getStorage(app).bucket(bucketName);
}

function sanitizeName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) return "file";
  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return normalized.slice(0, 120) || "file";
}

function buildUniqueFileName(originalName: string) {
  const safeName = sanitizeName(originalName);
  const extension = path.extname(safeName);
  return `${Date.now()}-${randomUUID()}${extension}`;
}

function encodeObjectPath(pathValue: string) {
  return pathValue
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function fromGcsStoragePath(storagePath: string) {
  if (!storagePath.startsWith(GCS_STORAGE_PREFIX)) return null;
  const objectPath = storagePath.slice(GCS_STORAGE_PREFIX.length).trim();
  return objectPath.length > 0 ? objectPath : null;
}

function resolveLocalDiskPath(storagePath: string): string | null {
  const normalizedPath = path.posix.normalize(storagePath);
  if (!normalizedPath.startsWith(LOCAL_TRACKING_PREFIX)) return null;
  return path.join(
    process.cwd(),
    "public",
    normalizedPath.replace(/^\/+/, ""),
  );
}

export async function uploadTrackingFile({
  requestId,
  originalName,
  bytes,
  contentType,
}: {
  requestId: string;
  originalName: string;
  bytes: Buffer;
  contentType: string | null;
}) {
  const uniqueFileName = buildUniqueFileName(originalName);
  const driver = getAttachmentStorageDriver();

  if (driver === "firebase") {
    const bucket = getFirebaseBucket();
    const objectPath = `tracking/${requestId}/${uniqueFileName}`;
    const file = bucket.file(objectPath);
    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: contentType || undefined,
        cacheControl: "private, max-age=0, no-store",
      },
    });
    return { storagePath: `${GCS_STORAGE_PREFIX}${objectPath}` };
  }

  const diskPath = path.join(LOCAL_TRACKING_ROOT, requestId, uniqueFileName);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, bytes);
  return {
    storagePath: `${LOCAL_TRACKING_PREFIX}${requestId}/${uniqueFileName}`,
  };
}

export async function deleteTrackingFile(storagePath: string) {
  const gcsObjectPath = fromGcsStoragePath(storagePath);
  if (gcsObjectPath) {
    const bucket = getFirebaseBucket();
    await bucket.file(gcsObjectPath).delete({ ignoreNotFound: true });
    return;
  }
  const diskPath = resolveLocalDiskPath(storagePath);
  if (!diskPath) return;
  await unlink(diskPath).catch(() => undefined);
}

export async function resolveTrackingFilePublicUrl(storagePath: string) {
  const gcsObjectPath = fromGcsStoragePath(storagePath);
  if (!gcsObjectPath) return storagePath;

  try {
    const bucket = getFirebaseBucket();
    const file = bucket.file(gcsObjectPath);
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
      version: "v4",
    });
    return signedUrl;
  } catch {
    const bucketName = getFirebaseStorageBucketName();
    if (!bucketName) return "";
    return `https://storage.googleapis.com/${bucketName}/${encodeObjectPath(gcsObjectPath)}`;
  }
}
