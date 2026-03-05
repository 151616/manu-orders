"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import {
  FormActionState,
  getNullableTrimmedString,
  getTrimmedString,
  toFieldErrors,
} from "@/lib/form-utils";
import { prisma } from "@/lib/prisma";
import { BookmarkCreateUpdateSchema } from "@/lib/schemas";

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

export async function listBookmarksForCurrentUser() {
  const user = await requireAuth();

  return prisma.bookmark.findMany({
    where: {
      createdByLabel: user.label,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getBookmarkById(bookmarkId: string) {
  const user = await requireAuth();

  if (!bookmarkId) {
    return null;
  }

  return prisma.bookmark.findFirst({
    where: {
      id: bookmarkId,
      createdByLabel: user.label,
    },
  });
}

export async function createBookmark(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const parsed = parseBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await prisma.bookmark.create({
    data: {
      ...parsed.data,
      createdByLabel: user.label,
    },
  });

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-created");
}

export async function updateBookmark(
  bookmarkId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const existing = await prisma.bookmark.findFirst({
    where: {
      id: bookmarkId,
      createdByLabel: user.label,
    },
  });

  if (!existing) {
    return {
      success: null,
      error: "Bookmark not found.",
      fieldErrors: {},
    };
  }

  const parsed = parseBookmarkInput(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: parsed.data,
  });

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-updated");
}

export async function deleteBookmark(bookmarkId: string) {
  const user = await requireAuth();

  const existing = await prisma.bookmark.findFirst({
    where: {
      id: bookmarkId,
      createdByLabel: user.label,
    },
  });

  if (!existing) {
    throw new Error("Bookmark not found.");
  }

  await prisma.bookmark.delete({
    where: { id: bookmarkId },
  });

  revalidatePath("/bookmarks");
  revalidatePath("/orders/new");
  redirect("/bookmarks?saved=bookmark-deleted");
}
