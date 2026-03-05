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
import { ActionIdSchema, BookmarkCreateUpdateSchema } from "@/lib/schemas";

const BOOKMARK_MUTATION_ALLOWED_FIELDS = [
  "name",
  "defaultVendor",
  "defaultOrderUrl",
  "defaultCategory",
  "defaultDescription",
] as const;

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

function parseBookmarkInput(formData: FormData) {
  const categoryRaw = getTrimmedString(formData.get("defaultCategory"));
  return BookmarkCreateUpdateSchema.safeParse({
    name: getTrimmedString(formData.get("name")),
    defaultVendor: getNullableTrimmedString(formData.get("defaultVendor")),
    defaultOrderUrl: getNullableTrimmedString(formData.get("defaultOrderUrl")),
    defaultCategory: categoryRaw ? categoryRaw : null,
    defaultDescription: getNullableTrimmedString(
      formData.get("defaultDescription"),
    ),
  });
}

function parseActionId(id: string) {
  const parsed = ActionIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
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

export async function listBookmarksForCurrentUser() {
  const user = await requireAuth();

  return prisma.bookmark.findMany({
    where: {
      createdByLabel: user.label,
      isDeleted: false,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listDeletedBookmarksForCurrentUser() {
  const user = await requireAdmin();

  return prisma.bookmark.findMany({
    where: {
      createdByLabel: user.label,
      isDeleted: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
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
      createdByLabel: user.label,
      isDeleted: false,
    },
  });
}

export async function createBookmark(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    BOOKMARK_MUTATION_ALLOWED_FIELDS,
  );

  if (hasUnexpectedFormKeys(formData, BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseBookmarkInput(formData);
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
        ...parsed.data,
        createdByLabel: user.label,
      },
    });

    await createBookmarkAuditLog({
      role: user.role,
      action: "BOOKMARK_CREATED",
      summary: `Bookmark created (${created.id}).`,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("createBookmark", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-created");
}

export async function updateBookmark(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    BOOKMARK_MUTATION_ALLOWED_FIELDS,
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

  if (hasUnexpectedFormKeys(formData, BOOKMARK_MUTATION_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseBookmarkInput(formData);
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
      action: "BOOKMARK_UPDATED",
      summary: `Bookmark updated (${parsedBookmarkId}).`,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("updateBookmark", error),
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
  redirect(redirectTarget);
}

export async function restoreBookmark(bookmarkId: string) {
  const parsedBookmarkId = parseActionId(bookmarkId);
  if (!parsedBookmarkId) {
    redirect("/bookmarks?saved=bookmark-not-found");
  }

  const user = await requireAdmin();
  let redirectTarget = "/bookmarks?saved=bookmark-restored";

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        createdByLabel: user.label,
        isDeleted: true,
      },
    });

    if (!existing) {
      redirectTarget = "/bookmarks?saved=bookmark-not-found";
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
    redirectTarget = "/bookmarks?saved=bookmark-failed";
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect(redirectTarget);
}

export async function permanentlyDeleteBookmark(bookmarkId: string) {
  const parsedBookmarkId = parseActionId(bookmarkId);
  if (!parsedBookmarkId) {
    redirect("/bookmarks?saved=bookmark-not-found");
  }

  const user = await requireAdmin();
  let redirectTarget = "/bookmarks?saved=bookmark-permanently-deleted";

  try {
    const existing = await prisma.bookmark.findFirst({
      where: {
        id: parsedBookmarkId,
        createdByLabel: user.label,
        isDeleted: true,
      },
    });

    if (!existing) {
      redirectTarget = "/bookmarks?saved=bookmark-not-found";
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
    redirectTarget = "/bookmarks?saved=bookmark-failed";
  }

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect(redirectTarget);
}
