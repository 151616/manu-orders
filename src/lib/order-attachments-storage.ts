import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServiceAccount } from "firebase-admin";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const LOCAL_ATTACHMENT_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
  "orders",
);
const LOCAL_ATTACHMENT_PREFIX = "/uploads/orders/";
const GCS_STORAGE_PREFIX = "gcs:";

type AttachmentStorageDriver = "local" | "firebase";

function getAttachmentStorageDriver(): AttachmentStorageDriver {
  const configured = process.env.ORDER_ATTACHMENT_STORAGE_DRIVER
    ?.trim()
    .toLowerCase();

  if (configured === "firebase") {
    return "firebase";
  }

  if (configured === "local") {
    return "local";
  }

  return process.env.NODE_ENV === "production" ? "firebase" : "local";
}

function getFirebaseStorageBucketName() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    null
  );
}

function getFirebaseServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.");
  }
}

function getFirebaseAdminApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const bucket = getFirebaseStorageBucketName();
  const serviceAccount = getFirebaseServiceAccountFromEnv();

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

function sanitizeAttachmentName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "attachment";
  }

  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return normalized.slice(0, 120) || "attachment";
}

function buildUniqueFileName(originalName: string) {
  const safeName = sanitizeAttachmentName(originalName);
  const extension = path.extname(safeName);
  return `${Date.now()}-${randomUUID()}${extension}`;
}

function encodeObjectPath(pathValue: string) {
  return pathValue
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function resolveLocalAttachmentDiskPath(storagePath: string): string | null {
  const normalizedPath = path.posix.normalize(storagePath);
  if (!normalizedPath.startsWith(LOCAL_ATTACHMENT_PREFIX)) {
    return null;
  }

  return path.join(process.cwd(), "public", normalizedPath.replace(/^\/+/, ""));
}

function toGcsStoragePath(objectPath: string) {
  return `${GCS_STORAGE_PREFIX}${objectPath}`;
}

function fromGcsStoragePath(storagePath: string) {
  if (!storagePath.startsWith(GCS_STORAGE_PREFIX)) {
    return null;
  }

  const objectPath = storagePath.slice(GCS_STORAGE_PREFIX.length).trim();
  return objectPath.length > 0 ? objectPath : null;
}

export async function uploadOrderAttachmentObject({
  orderId,
  originalName,
  bytes,
  contentType,
}: {
  orderId: string;
  originalName: string;
  bytes: Buffer;
  contentType: string | null;
}) {
  const uniqueFileName = buildUniqueFileName(originalName);
  const driver = getAttachmentStorageDriver();

  if (driver === "firebase") {
    const bucket = getFirebaseBucket();
    const objectPath = `orders/${orderId}/${uniqueFileName}`;
    const file = bucket.file(objectPath);

    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: contentType || undefined,
        cacheControl: "private, max-age=0, no-store",
      },
    });

    return {
      storagePath: toGcsStoragePath(objectPath),
    };
  }

  const diskPath = path.join(LOCAL_ATTACHMENT_ROOT, orderId, uniqueFileName);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, bytes);

  return {
    storagePath: `${LOCAL_ATTACHMENT_PREFIX}${orderId}/${uniqueFileName}`,
  };
}

export async function deleteOrderAttachmentObject(storagePath: string) {
  const gcsObjectPath = fromGcsStoragePath(storagePath);
  if (gcsObjectPath) {
    const bucket = getFirebaseBucket();
    await bucket.file(gcsObjectPath).delete({
      ignoreNotFound: true,
    });
    return;
  }

  const diskPath = resolveLocalAttachmentDiskPath(storagePath);
  if (!diskPath) {
    return;
  }

  await unlink(diskPath).catch(() => undefined);
}

export async function resolveOrderAttachmentPublicUrl(storagePath: string) {
  const gcsObjectPath = fromGcsStoragePath(storagePath);
  if (!gcsObjectPath) {
    return storagePath;
  }

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
    if (!bucketName) {
      return "";
    }

    return `https://storage.googleapis.com/${bucketName}/${encodeObjectPath(gcsObjectPath)}`;
  }
}
