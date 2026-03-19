import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const globalForFirestore = globalThis as unknown as {
  _firestore?: Firestore;
};

function getFirebaseServiceAccount(): ServiceAccount | null {
  // Check multiple env vars — different parts of the app may configure differently
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() ||
    null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("Service account key JSON is invalid.");
  }
}

function getFirebaseApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    undefined;

  // On Firebase App Hosting, ADC auto-uses
  // firebase-app-hosting-compute@<project>.iam.gserviceaccount.com
  // — no explicit credential needed.
  // Locally, fall back to a service-account JSON from env vars.
  const serviceAccount = getFirebaseServiceAccount();

  return initializeApp({
    ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

function createFirestore(): Firestore {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  return db;
}

/**
 * Singleton Firestore instance.
 * Lazily initialised on first property access so module-level imports are safe.
 */
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, property, receiver) {
    if (!globalForFirestore._firestore) {
      globalForFirestore._firestore = createFirestore();
    }
    const value = Reflect.get(
      globalForFirestore._firestore as object,
      property,
      receiver,
    );
    return typeof value === "function"
      ? value.bind(globalForFirestore._firestore)
      : value;
  },
});

/* ------------------------------------------------------------------ */
/*  Collection references                                             */
/* ------------------------------------------------------------------ */

/** Users collection — the single source of truth for all user data. */
export const usersCollection = () => db.collection("users");

/** Orders collection. */
export const ordersCollection = () => db.collection("orders");

/** Order requests collection (members requesting parts to be ordered). */
export const orderRequestsCollection = () => db.collection("orderRequests");

/** Tracking requests collection (members requesting manufacturing tasks). */
export const trackingRequestsCollection = () => db.collection("trackingRequests");

/* ------------------------------------------------------------------ */
/*  TypeScript types mirroring the Firestore document shape           */
/* ------------------------------------------------------------------ */

export interface OrderDoc {
  title: string;
  description: string | null;
  requesterName: string;
  vendor: string | null;
  orderNumber: string | null;
  orderUrl: string | null;
  quantity: number | null;
  category: string; // OrderCategory
  priority: number; // 1-5
  etaDays: number;
  etaTargetDate: FirebaseFirestore.Timestamp | null;
  status: string; // OrderStatus
  isDeleted: boolean;
  notesFromManu: string | null;
  robot: string | null; // "LAMBDA" | "GAMMA" | null
  createdByLabel: string | null;
  updatedAt: FirebaseFirestore.Timestamp;
}

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ManuRequestDoc {
  title: string;
  description: string | null;
  type: string; // CNC | DRILL | TAP | CUT | OTHER
  otherType: string | null;
  isFinished: boolean;
  priority: number; // 1–5 stars
  robot: string | null;
  createdByLabel: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

/** Manufacturing tracking requests (direct tasks, not approval-gated). */
export const manuRequestsCollection = () => db.collection("manuRequests");

export interface OrderRequestDoc {
  status: RequestStatus;
  submittedByLabel: string;
  submittedByUserId: string;
  reviewedAt: FirebaseFirestore.Timestamp | null;
  reviewedByLabel: string | null;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  vendor: string | null;
  orderUrl: string | null;
  quantity: number | null;
  category: string;
  priority: number;
  etaDays: number;
  robot: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface TrackingRequestDoc {
  status: RequestStatus;
  submittedByLabel: string;
  submittedByUserId: string;
  reviewedAt: FirebaseFirestore.Timestamp | null;
  reviewedByLabel: string | null;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  type: string; // CNC | DRILL | TAP | CUT | OTHER
  otherType: string | null;
  robot: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UserDoc {
  /** Auto-generated document ID (= the user_id). */
  userId: string;
  /** Hashed 4-digit PIN (bcrypt). */
  pin: string;
  /** User-provided display name (first + last). */
  nickname: string;
  /** Free-text team position (e.g. "Electrical Team Lead"). */
  position: string;
  /** Free-text subteam (e.g. "Assembly"). Optional. */
  subteam: string;
  /**
   * Permission level 1–5.
   *  1 = Admin (highest on-site)
   *  2 = Upper Leadership
   *  3 = Lower Leadership
   *  4 = Approved Member
   *  5 = Pending / Unapproved (default)
   */
  permissionLevel: number;
  /** Firestore server timestamp. */
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
