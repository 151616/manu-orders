"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { handleServerMutationError } from "@/lib/action-errors";
import {
  collectSubmittedValues,
  FormActionState,
  getNullableTrimmedString,
  getTrimmedString,
  toFieldErrors,
} from "@/lib/form-utils";
import { prisma } from "@/lib/prisma";
import {
  ActionIdSchema,
  BookmarkSiteCreateUpdateSchema,
  BookmarkTemplateCreateUpdateSchema,
} from "@/lib/schemas";

const TEMPLATE_BOOKMARK_MUTATION_ALLOWED_FIELDS = [
  "name",
  "defaultVendor",
  "defaultOrderUrl",
  "defaultCategory",
  "defaultDescription",
] as const;

const SITE_BOOKMARK_MUTATION_ALLOWED_FIELDS = [
  "name",
  "siteUrl",
  "siteVendorHint",
] as const;

const LIST_BOOKMARKS_TIMEOUT_MS = 5000;

type BookmarkTrashRedirectTarget = "bookmarks" | "trash";

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

function hasUnexpectedFormKeys(
  formData: FormData,
  allowedFields: readonly string[],
) {
  const allowed = new Set(allowedFields);

  for (const key of formData.keys()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }
    if (!allowed.has(key)) {
      return true;
    }
  }

  return false;
}

function parseTemplateBookmarkInput(formData: FormData) {
  const categoryRaw = getTrimmedString(formData.get("defaultCategory"));
  return BookmarkTemplateCreateUpdateSchema.safeParse({
    name: getTrimmedString(formData.get("name")),
    defaultVendor: getNullableTrimmedString(formData.get("defaultVendor")),
    defaultOrderUrl: getNullableTrimmedString(formData.get("defaultOrderUrl")),
    defaultCategory: categoryRaw ? categoryRaw : null,
    defaultDescription: getNullableTrimmedString(
      formData.get("defaultDescription"),
    ),
  });
}

function parseSiteBookmarkInput(formData: FormData) {
  return BookmarkSiteCreateUpdateSchema.safeParse({
    name: getTrimmedString(formData.get("name")),
    siteUrl: getNullableTrimmedString(formData.get("siteUrl")),
    siteVendorHint: getNullableTrimmedString(formData.get("siteVendorHint")),
  });
}

function parseActionId(id: string) {
  const parsed = ActionIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

function bookmarkRedirectPath(
  target: BookmarkTrashRedirectTarget,
  messageCode: string,
) {
  if (target === "trash") {
    return `/trash?toast=${messageCode}&tone=success`;
  }

  return `/bookmarks?saved=${messageCode}`;
}

function bookmarkFailurePath(target: BookmarkTrashRedirectTarget) {
  if (target === "trash") {
    return "/trash?toast=operation-failed&tone=debug";
  }

  return "/bookmarks?saved=bookmark-failed";
}

function bookmarkNotFoundPath(target: BookmarkTrashRedirectTarget) {
  if (target === "trash") {
    return "/trash?toast=bookmark-not-found&tone=debug";
  }

  return "/bookmarks?saved=bookmark-not-found";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getPrismaErrorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  return null;
}

function getErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const value = (error as { name?: unknown }).name;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  if (error instanceof Error) {
    return error.constructor.name;
  }

  return "UnknownError";
}

function getErrorDiagnosticTag(error: unknown) {
  const code = getPrismaErrorCode(error) ?? "none";
  return `${getErrorName(error)}:${code}`;
}

function isSiteBookmarkSchemaError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  const code = getPrismaErrorCode(error);

  if (code === "P2021" || code === "P2022") {
    return true;
  }

  return (
    message.includes("bookmarkkind") ||
    message.includes("column") && message.includes("kind") && message.includes("bookmark") ||
    message.includes("siteurl") ||
    message.includes("sitevendorhint") ||
    message.includes("invalid input value for enum") ||
    message.includes("does not exist in current database")
  );
}

function siteBookmarkFailureHint(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  const code = getPrismaErrorCode(error);
  const errorName = getErrorName(error).toLowerCase();

  if (
    message.includes("environment variable not found") &&
    message.includes("database_url")
  ) {
    return "db-url-missing";
  }

  if (
    message.includes("can't reach database server") ||
    message.includes("connect etimedout") ||
    message.includes("econnrefused") ||
    message.includes("no pg_hba.conf entry")
  ) {
    return "db-unreachable";
  }

  if (
    message.includes("authentication failed") ||
    message.includes("password authentication failed")
  ) {
    return "db-auth-failed";
  }

  if (message.includes("database") && message.includes("does not exist")) {
    return "db-not-found";
  }

  if (
    message.includes("ssl") ||
    message.includes("certificate") ||
    message.includes("tls")
  ) {
    return "db-ssl-config";
  }

  if (code === "P1001" || message.includes("can't reach database server")) {
    return "database-unreachable";
  }

  if (code === "P1002" || message.includes("timed out")) {
    return "database-timeout";
  }

  if (isSiteBookmarkSchemaError(error)) {
    return "bookmark-schema-outdated";
  }

  if (message.includes("permission denied")) {
    return "database-permission-denied";
  }

  if (message.includes("must be owner of")) {
    return "database-owner-required";
  }

  if (
    message.includes("remaining connection slots are reserved") ||
    message.includes("too many clients already")
  ) {
    return "database-connection-limit";
  }

  if (code) {
    return `prisma-${code.toLowerCase()}`;
  }

  if (errorName.includes("initialization")) {
    return "prisma-init-failed";
  }

  return "unknown";
}

async function ensureSiteBookmarkSchemaCompatibility() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      CREATE TYPE "BookmarkKind" AS ENUM ('TEMPLATE', 'SITE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "kind" "BookmarkKind" NOT NULL DEFAULT 'TEMPLATE';`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "siteUrl" TEXT;`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "siteVendorHint" TEXT;`,
  );
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Bookmark_createdByLabel_isDeleted_kind_createdAt_idx"
    ON "Bookmark"("createdByLabel", "isDeleted", "kind", "createdAt");
  `);
}

async function createBookmarkAuditLog({
  role,
  action,
  summary,
}: {
  role: string;
  action: string;
  summary: string;
}) {
  try {
    await prisma.orderActivity.create({
      data: {
        orderId: null,
        role,
        action,
        details: JSON.stringify({
          summary,
          diffs: [],
        }),
      },
    });
  } catch (error) {
    console.error("[bookmarks] createBookmarkAuditLog failed (non-blocking).", {
      role,
      action,
      summary,
      error: errorMessage(error),
    });
  }
}

export async function listTemplateBookmarksForCurrentUser() {
  const user = await requireAuth();

  try {
    return await withTimeout(
      prisma.bookmark.findMany({
        where: {
          kind: "TEMPLATE",
          isDeleted: false,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      LIST_BOOKMARKS_TIMEOUT_MS,
      "listTemplateBookmarksForCurrentUser query timed out.",
    );
  } catch (error) {
    console.error("[bookmarks] listTemplateBookmarksForCurrentUser failed.", {
      role: user.role,
      label: user.label,
      error,
    });
    return [];
  }
}

export async function listSiteBookmarksForCurrentUser() {
  const user = await requireAuth();
  const findBookmarks = () =>
    withTimeout(
      prisma.bookmark.findMany({
        where: {
          kind: "SITE",
          isDeleted: false,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      LIST_BOOKMARKS_TIMEOUT_MS,
      "listSiteBookmarksForCurrentUser query timed out.",
    );

  try {
    return await findBookmarks();
  } catch (error) {
    if (isSiteBookmarkSchemaError(error)) {
      try {
        await ensureSiteBookmarkSchemaCompatibility();
        return await findBookmarks();
      } catch (repairError) {
        console.error(
          "[bookmarks] listSiteBookmarksForCurrentUser schema repair failed.",
          {
            role: user.role,
            label: user.label,
            originalError: errorMessage(error),
            repairError: errorMessage(repairError),
          },
        );
      }
    }

    console.error("[bookmarks] listSiteBookmarksForCurrentUser failed.", {
      role: user.role,
      label: user.label,
      error: errorMessage(error),
    });
    return [];
  }
}

export async function listDeletedBookmarksForCurrentUser() {
  const user = await requireAdmin();

  try {
    return await withTimeout(
      prisma.bookmark.findMany({
        where: {
          isDeleted: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      LIST_BOOKMARKS_TIMEOUT_MS,
      "listDeletedBookmarksForCurrentUser query timed out.",
    );
  } catch (error) {
    console.error("[bookmarks] listDeletedBookmarksForCurrentUser failed.", {
      role: user.role,
      label: user.label,
      error,
    });
    return [];
  }
}

export async function getBookmarkById(bookmarkId: string) {
  const user = await requireAuth();
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return null;
  }

  return prisma.bookmark.findFirst({
    where: {
      id: parsedBookmarkId,
      kind: "TEMPLATE",
      isDeleted: false,
    },
  });
}

export async function getSiteBookmarkById(bookmarkId: string) {
  const user = await requireAuth();
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return null;
  }

  const findBookmark = () =>
    prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        kind: "SITE",
        isDeleted: false,
      },
    });

  try {
    return await findBookmark();
  } catch (error) {
    if (isSiteBookmarkSchemaError(error)) {
      try {
        await ensureSiteBookmarkSchemaCompatibility();
        return await findBookmark();
      } catch (repairError) {
        console.error("[bookmarks] getSiteBookmarkById schema repair failed.", {
          role: user.role,
          label: user.label,
          bookmarkId: parsedBookmarkId,
          originalError: errorMessage(error),
          repairError: errorMessage(repairError),
        });
      }
    }

    console.error("[bookmarks] getSiteBookmarkById failed.", {
      role: user.role,
      label: user.label,
      bookmarkId: parsedBookmarkId,
      error: errorMessage(error),
    });
    return null;
  }
}

export async function createTemplateBookmark(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    TEMPLATE_BOOKMARK_MUTATION_ALLOWED_FIELDS,
  );

  if (hasUnexpectedFormKeys(formData, TEMPLATE_BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseTemplateBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  try {
    const created = await prisma.bookmark.create({
      data: {
        kind: "TEMPLATE",
        ...parsed.data,
        createdByLabel: user.label,
      },
    });

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_TEMPLATE_CREATED",
      summary: `Template bookmark created (${created.id}).`,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("createTemplateBookmark", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  return {
    success: "Template bookmark created.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

export async function createSiteBookmark(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    SITE_BOOKMARK_MUTATION_ALLOWED_FIELDS,
  );

  if (hasUnexpectedFormKeys(formData, SITE_BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseSiteBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  const createRecord = () =>
    prisma.bookmark.create({
      data: {
        kind: "SITE",
        name: parsed.data.name,
        siteUrl: parsed.data.siteUrl,
        siteVendorHint: parsed.data.siteVendorHint,
        createdByLabel: user.label,
      },
    });

  try {
    const created = await createRecord();

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_SITE_CREATED",
      summary: `Site bookmark created (${created.id}).`,
    });
  } catch (error) {
    const shouldAttemptRepair = isSiteBookmarkSchemaError(error);

    if (shouldAttemptRepair) {
      try {
        await ensureSiteBookmarkSchemaCompatibility();
        const createdAfterRepair = await createRecord();
        await createBookmarkAuditLog({
          role: user.role,
          action: "BOOKMARK_SITE_CREATED",
          summary: `Site bookmark created (${createdAfterRepair.id}).`,
        });

        revalidatePath("/bookmarks");
        revalidatePath("/orders/new");
        redirect("/bookmarks?saved=bookmark-created");
      } catch (repairError) {
        return {
          success: null,
          error: handleServerMutationError(
            "createSiteBookmark-schema-repair",
            repairError,
            "Website bookmarks need a DB update and repair failed. Please try again shortly.",
          ),
          fieldErrors: {},
          submittedValues,
        };
      }
    }

    const hint = siteBookmarkFailureHint(error);
    console.error("[bookmarks] createSiteBookmark failed.", {
      role: user.role,
      label: user.label,
      hint,
      diag: getErrorDiagnosticTag(error),
      code: getPrismaErrorCode(error),
      error: errorMessage(error),
    });

    return {
      success: null,
      error: handleServerMutationError(
        "createSiteBookmark",
        error,
        `Website bookmark save failed (${hint}; diag:${getErrorDiagnosticTag(
          error,
        )}). Please try again.`,
      ),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  return {
    success: "Website bookmark added to your navigation.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

export async function updateTemplateBookmark(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    TEMPLATE_BOOKMARK_MUTATION_ALLOWED_FIELDS,
  );
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return {
      success: null,
      error: "Invalid bookmark request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  if (hasUnexpectedFormKeys(formData, TEMPLATE_BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseTemplateBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        kind: "TEMPLATE",
        isDeleted: false,
      },
    });

    if (!existing) {
      return {
        success: null,
        error: "Bookmark not found.",
        fieldErrors: {},
        submittedValues,
      };
    }

    await prisma.bookmark.update({
      where: { id: parsedBookmarkId },
      data: parsed.data,
    });

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_TEMPLATE_UPDATED",
      summary: `Template bookmark updated (${parsedBookmarkId}).`,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("updateTemplateBookmark", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-updated");
}

export async function updateSiteBookmark(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    SITE_BOOKMARK_MUTATION_ALLOWED_FIELDS,
  );
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return {
      success: null,
      error: "Invalid bookmark request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  if (hasUnexpectedFormKeys(formData, SITE_BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseSiteBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  const runUpdate = async () => {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        kind: "SITE",
        isDeleted: false,
      },
    });

    if (!existing) {
      return {
        ok: false as const,
        state: {
          success: null,
          error: "Bookmark not found.",
          fieldErrors: {},
          submittedValues,
        } satisfies FormActionState,
      };
    }

    await prisma.bookmark.update({
      where: { id: parsedBookmarkId },
      data: {
        name: parsed.data.name,
        siteUrl: parsed.data.siteUrl,
        siteVendorHint: parsed.data.siteVendorHint,
      },
    });

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_SITE_UPDATED",
      summary: `Site bookmark updated (${parsedBookmarkId}).`,
    });

    return { ok: true as const };
  };

  try {
    const updated = await runUpdate();
    if (!updated.ok) {
      return updated.state;
    }
  } catch (error) {
    if (isSiteBookmarkSchemaError(error)) {
      try {
        await ensureSiteBookmarkSchemaCompatibility();
        const repairedUpdate = await runUpdate();
        if (!repairedUpdate.ok) {
          return repairedUpdate.state;
        }

        revalidatePath("/bookmarks");
        revalidatePath("/orders/new");
        redirect("/bookmarks?saved=bookmark-updated");
      } catch (repairError) {
        return {
          success: null,
          error: handleServerMutationError(
            "updateSiteBookmark-schema-repair",
            repairError,
            "Website bookmarks need a DB update and repair failed. Please try again shortly.",
          ),
          fieldErrors: {},
          submittedValues,
        };
      }
    }

    return {
      success: null,
      error: handleServerMutationError("updateSiteBookmark", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-updated");
}

export async function deleteBookmark(bookmarkId: string) {
  const parsedBookmarkId = parseActionId(bookmarkId);
  if (!parsedBookmarkId) {
    redirect("/bookmarks?saved=bookmark-not-found");
  }

  const user = await requireAdmin();
  let redirectTarget = "/bookmarks?saved=bookmark-deleted";

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        isDeleted: false,
      },
    });

    if (!existing) {
      redirectTarget = "/bookmarks?saved=bookmark-not-found";
    } else {
      await prisma.bookmark.update({
        where: { id: parsedBookmarkId },
        data: {
          isDeleted: true,
        },
      });

      await createBookmarkAuditLog({
        role: user.role,
        action: "BOOKMARK_SOFT_DELETED",
        summary: `Bookmark moved to trash (${parsedBookmarkId}).`,
      });
    }
  } catch (error) {
    handleServerMutationError("deleteBookmark", error);
    redirectTarget = "/bookmarks?saved=bookmark-failed";
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  revalidatePath("/trash");
  redirect(redirectTarget);
}

export async function restoreBookmark(
  bookmarkId: string,
  returnTo: BookmarkTrashRedirectTarget = "bookmarks",
) {
  const parsedBookmarkId = parseActionId(bookmarkId);
  if (!parsedBookmarkId) {
    redirect(bookmarkNotFoundPath(returnTo));
  }

  const user = await requireAdmin();
  let redirectTarget = bookmarkRedirectPath(returnTo, "bookmark-restored");

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        isDeleted: true,
      },
    });

    if (!existing) {
      redirectTarget = bookmarkNotFoundPath(returnTo);
    } else {
      await prisma.bookmark.update({
        where: { id: parsedBookmarkId },
        data: {
          isDeleted: false,
        },
      });

      await createBookmarkAuditLog({
        role: user.role,
        action: "BOOKMARK_RESTORED",
        summary: `Bookmark restored (${parsedBookmarkId}).`,
      });
    }
  } catch (error) {
    handleServerMutationError("restoreBookmark", error);
    redirectTarget = bookmarkFailurePath(returnTo);
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  revalidatePath("/trash");
  redirect(redirectTarget);
}

export async function permanentlyDeleteBookmark(
  bookmarkId: string,
  returnTo: BookmarkTrashRedirectTarget = "bookmarks",
) {
  const parsedBookmarkId = parseActionId(bookmarkId);
  if (!parsedBookmarkId) {
    redirect(bookmarkNotFoundPath(returnTo));
  }

  const user = await requireAdmin();
  let redirectTarget = bookmarkRedirectPath(
    returnTo,
    "bookmark-permanently-deleted",
  );

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        isDeleted: true,
      },
    });

    if (!existing) {
      redirectTarget = bookmarkNotFoundPath(returnTo);
    } else {
      await createBookmarkAuditLog({
        role: user.role,
        action: "BOOKMARK_PERMANENTLY_DELETED",
        summary: `Bookmark permanently deleted (${parsedBookmarkId}).`,
      });

      await prisma.bookmark.delete({
        where: { id: parsedBookmarkId },
      });
    }
  } catch (error) {
    handleServerMutationError("permanentlyDeleteBookmark", error);
    redirectTarget = bookmarkFailurePath(returnTo);
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  revalidatePath("/trash");
  redirect(redirectTarget);
}

// ─── Quick inline URL updates (no redirect) ───────────────────────────────────

export async function updateSiteBookmarkLink(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return { success: null, error: "Invalid bookmark.", fieldErrors: {}, submittedValues: {} };
  }

  const siteUrl = getNullableTrimmedString(formData.get("siteUrl"));

  const existing = await prisma.bookmark.findFirst({
    where: { id: parsedBookmarkId, kind: "SITE", isDeleted: false },
  });

  if (!existing) {
    return { success: null, error: "Bookmark not found.", fieldErrors: {}, submittedValues: { siteUrl: siteUrl ?? "" } };
  }

  try {
    await prisma.bookmark.update({ where: { id: parsedBookmarkId }, data: { siteUrl } });
  } catch (error) {
    return { success: null, error: handleServerMutationError("updateSiteBookmarkLink", error), fieldErrors: {}, submittedValues: { siteUrl: siteUrl ?? "" } };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  return { success: "Saved.", error: null, fieldErrors: {}, submittedValues: { siteUrl: siteUrl ?? "" } };
}

export async function updateTemplateBookmarkLink(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const parsedBookmarkId = parseActionId(bookmarkId);

  if (!parsedBookmarkId) {
    return { success: null, error: "Invalid bookmark.", fieldErrors: {}, submittedValues: {} };
  }

  const defaultOrderUrl = getNullableTrimmedString(formData.get("defaultOrderUrl"));

  const existing = await prisma.bookmark.findFirst({
    where: { id: parsedBookmarkId, kind: "TEMPLATE", isDeleted: false },
  });

  if (!existing) {
    return { success: null, error: "Bookmark not found.", fieldErrors: {}, submittedValues: { defaultOrderUrl: defaultOrderUrl ?? "" } };
  }

  try {
    await prisma.bookmark.update({ where: { id: parsedBookmarkId }, data: { defaultOrderUrl } });
  } catch (error) {
    return { success: null, error: handleServerMutationError("updateTemplateBookmarkLink", error), fieldErrors: {}, submittedValues: { defaultOrderUrl: defaultOrderUrl ?? "" } };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  return { success: "Saved.", error: null, fieldErrors: {}, submittedValues: { defaultOrderUrl: defaultOrderUrl ?? "" } };
}
