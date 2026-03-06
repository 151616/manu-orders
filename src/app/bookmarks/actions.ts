"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

async function createBookmarkAuditLog({
  role,
  action,
  summary,
}: {
  role: string;
  action: string;
  summary: string;
}) {
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
}

export async function listTemplateBookmarksForCurrentUser() {
  const user = await requireAuth();

  try {
    return await withTimeout(
      prisma.bookmark.findMany({
        where: {
          kind: "TEMPLATE",
          createdByLabel: user.label,
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

  try {
    return await withTimeout(
      prisma.bookmark.findMany({
        where: {
          kind: "SITE",
          createdByLabel: user.label,
          isDeleted: false,
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      LIST_BOOKMARKS_TIMEOUT_MS,
      "listSiteBookmarksForCurrentUser query timed out.",
    );
  } catch (error) {
    console.error("[bookmarks] listSiteBookmarksForCurrentUser failed.", {
      role: user.role,
      label: user.label,
      error,
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
          createdByLabel: user.label,
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
      createdByLabel: user.label,
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

  return prisma.bookmark.findFirst({
    where: {
      id: parsedBookmarkId,
      kind: "SITE",
      createdByLabel: user.label,
      isDeleted: false,
    },
  });
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
  redirect("/bookmarks?saved=bookmark-created");
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

  try {
    const created = await prisma.bookmark.create({
      data: {
        kind: "SITE",
        name: parsed.data.name,
        siteUrl: parsed.data.siteUrl,
        siteVendorHint: parsed.data.siteVendorHint,
        createdByLabel: user.label,
      },
    });

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_SITE_CREATED",
      summary: `Site bookmark created (${created.id}).`,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("createSiteBookmark", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-created");
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
        createdByLabel: user.label,
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

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        kind: "SITE",
        createdByLabel: user.label,
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
  } catch (error) {
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
        createdByLabel: user.label,
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
        createdByLabel: user.label,
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
        createdByLabel: user.label,
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
