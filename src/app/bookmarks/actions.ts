"use server";

// Bookmarks actions — Prisma removed. Will be rebuilt with Firestore.

import { requireAuth, requireAdmin } from "@/lib/auth";
import { FormActionState } from "@/lib/form-utils";

const STUB_STATE: FormActionState = {
  success: null,
  error: "This feature is being rebuilt.",
  fieldErrors: {},
  submittedValues: {},
};

export async function listTemplateBookmarksForCurrentUser() {
  await requireAuth();
  return [];
}

export async function listSiteBookmarksForCurrentUser() {
  await requireAuth();
  return [];
}

export async function listDeletedBookmarksForCurrentUser() {
  await requireAdmin();
  return [];
}

export async function getBookmarkById(_bookmarkId: string) {
  await requireAuth();
  return null;
}

export async function getSiteBookmarkById(_bookmarkId: string) {
  await requireAuth();
  return null;
}

export async function createTemplateBookmark(
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}

export async function createSiteBookmark(
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}

export async function updateTemplateBookmark(
  _bookmarkId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}

export async function updateSiteBookmark(
  _bookmarkId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}

export async function deleteBookmark(_bookmarkId: string) {
  await requireAdmin();
}

export async function restoreBookmark(
  _bookmarkId: string,
  _returnTo?: string,
) {
  await requireAdmin();
}

export async function permanentlyDeleteBookmark(
  _bookmarkId: string,
  _returnTo?: string,
) {
  await requireAdmin();
}

export async function updateSiteBookmarkLink(
  _bookmarkId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}

export async function updateTemplateBookmarkLink(
  _bookmarkId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return STUB_STATE;
}
