"use client";

import Link from "next/link";
import { Bookmark } from "@prisma/client";
import { useActionState } from "react";
import { deleteBookmark, updateBookmark } from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";

type BookmarkCardProps = {
  bookmark: Bookmark;
  canMutate: boolean;
};

export function BookmarkCard({ bookmark, canMutate }: BookmarkCardProps) {
  const updateAction = updateBookmark.bind(null, bookmark.id);
  const deleteAction = deleteBookmark.bind(null, bookmark.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);
  const valueFor = (field: string, fallback: string = "") =>
    state.submittedValues[field] ?? fallback;

  return (
    <article className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-black">{bookmark.name}</h3>
        {canMutate ? (
          <Link
            href={`/orders/new?fromBookmark=${bookmark.id}`}
            className="rounded-md border border-black/20 px-3 py-1 text-xs font-medium text-black hover:bg-black/5"
          >
            Create Order From Bookmark
          </Link>
        ) : null}
      </div>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      {canMutate ? (
        <>
          <form action={formAction} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70">Name</span>
              <input
                name="name"
                defaultValue={valueFor("name", bookmark.name)}
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
              />
              {state.fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-black/70">
                Default Vendor
              </span>
              <input
                name="defaultVendor"
                defaultValue={valueFor("defaultVendor", bookmark.defaultVendor ?? "")}
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
              />
              {state.fieldErrors.defaultVendor ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultVendor}
                </p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-black/70">
                Default Category
              </span>
              <select
                name="defaultCategory"
                defaultValue={valueFor("defaultCategory", bookmark.defaultCategory ?? "")}
                className="w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
              >
                <option value="">None</option>
                {ORDER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {ORDER_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              {state.fieldErrors.defaultCategory ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultCategory}
                </p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70">
                Default Order URL
              </span>
              <input
                name="defaultOrderUrl"
                defaultValue={valueFor("defaultOrderUrl", bookmark.defaultOrderUrl ?? "")}
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
              />
              {state.fieldErrors.defaultOrderUrl ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultOrderUrl}
                </p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70">
                Default Description
              </span>
              <textarea
                name="defaultDescription"
                rows={3}
                defaultValue={valueFor("defaultDescription", bookmark.defaultDescription ?? "")}
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
              />
              {state.fieldErrors.defaultDescription ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultDescription}
                </p>
              ) : null}
            </label>

            <div className="sm:col-span-2 flex items-center gap-2">
              <SubmitButton idleLabel="Save Bookmark" pendingLabel="Saving..." />
            </div>
          </form>

          <form action={deleteAction}>
            <SubmitButton
              idleLabel="Move to Trash"
              pendingLabel="Moving..."
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </form>
        </>
      ) : (
        <div className="space-y-2 text-sm text-black/75">
          <p>Vendor: {bookmark.defaultVendor ?? "N/A"}</p>
          <p>Category: {bookmark.defaultCategory ?? "N/A"}</p>
          <p>Order URL: {bookmark.defaultOrderUrl ?? "N/A"}</p>
          <p>Description: {bookmark.defaultDescription ?? "N/A"}</p>
        </div>
      )}
    </article>
  );
}
