"use client";

import Link from "next/link";
import { Bookmark } from "@prisma/client";
import { useActionState } from "react";
import {
  deleteBookmark,
  updateSiteBookmark,
  updateTemplateBookmark,
} from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";

type BookmarkCardProps = {
  bookmark: Bookmark;
  canMutate: boolean;
};

function valueFor(
  submittedValues: Record<string, string>,
  field: string,
  fallback: string = "",
) {
  return submittedValues[field] ?? fallback;
}

function TemplateBookmarkCard({
  bookmark,
  canMutate,
}: BookmarkCardProps) {
  const updateAction = updateTemplateBookmark.bind(null, bookmark.id);
  const deleteAction = deleteBookmark.bind(null, bookmark.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);

  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-black dark:text-white">{bookmark.name}</h3>
          <p className="text-xs text-black/55 dark:text-white/55">Template bookmark</p>
        </div>
        <Link
          href={`/orders/new?fromBookmark=${bookmark.id}`}
          className="w-full rounded-lg border border-black/20 px-3 py-1.5 text-center text-xs font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          Create Order
        </Link>
      </div>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      {canMutate ? (
        <>
          <form action={formAction} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">Name</span>
              <input
                name="name"
                defaultValue={valueFor(state.submittedValues, "name", bookmark.name)}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Default Vendor
              </span>
              <input
                name="defaultVendor"
                defaultValue={valueFor(
                  state.submittedValues,
                  "defaultVendor",
                  bookmark.defaultVendor ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.defaultVendor ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultVendor}
                </p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Default Category
              </span>
              <select
                name="defaultCategory"
                defaultValue={valueFor(
                  state.submittedValues,
                  "defaultCategory",
                  bookmark.defaultCategory ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
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
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Default Order URL
              </span>
              <input
                name="defaultOrderUrl"
                defaultValue={valueFor(
                  state.submittedValues,
                  "defaultOrderUrl",
                  bookmark.defaultOrderUrl ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.defaultOrderUrl ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultOrderUrl}
                </p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Default Description
              </span>
              <textarea
                name="defaultDescription"
                rows={3}
                defaultValue={valueFor(
                  state.submittedValues,
                  "defaultDescription",
                  bookmark.defaultDescription ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.defaultDescription ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.defaultDescription}
                </p>
              ) : null}
            </label>

            <div className="sm:col-span-2">
              <SubmitButton idleLabel="Save Template" pendingLabel="Saving..." />
            </div>
          </form>

          <form action={deleteAction}>
            <SubmitButton
              idleLabel="Move to Trash"
              pendingLabel="Moving..."
              className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            />
          </form>
        </>
      ) : (
        <div className="space-y-2 text-sm text-black/75 dark:text-white/75">
          <p>Vendor: {bookmark.defaultVendor ?? "N/A"}</p>
          <p>Category: {bookmark.defaultCategory ?? "N/A"}</p>
          <p>Order URL: {bookmark.defaultOrderUrl ?? "N/A"}</p>
          <p>Description: {bookmark.defaultDescription ?? "N/A"}</p>
        </div>
      )}
    </article>
  );
}

function SiteBookmarkCard({
  bookmark,
  canMutate,
}: BookmarkCardProps) {
  const updateAction = updateSiteBookmark.bind(null, bookmark.id);
  const deleteAction = deleteBookmark.bind(null, bookmark.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);

  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-black dark:text-white">{bookmark.name}</h3>
          <p className="text-xs text-black/55 dark:text-white/55">Website bookmark</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href={`/orders/new?siteBookmarkId=${bookmark.id}`}
            className="rounded-lg border border-black/20 px-3 py-1.5 text-center text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Use in New Order
          </Link>
          {bookmark.siteUrl ? (
            <a
              href={bookmark.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-center text-xs font-semibold text-black/80 hover:bg-slate-100 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10"
            >
              Open Site
            </a>
          ) : null}
        </div>
      </div>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      {canMutate ? (
        <>
          <form action={formAction} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Website URL
              </span>
              <input
                name="siteUrl"
                defaultValue={valueFor(
                  state.submittedValues,
                  "siteUrl",
                  bookmark.siteUrl ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.siteUrl ? (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.siteUrl}</p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">Name</span>
              <input
                name="name"
                defaultValue={valueFor(state.submittedValues, "name", bookmark.name)}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Vendor Hint
              </span>
              <input
                name="siteVendorHint"
                defaultValue={valueFor(
                  state.submittedValues,
                  "siteVendorHint",
                  bookmark.siteVendorHint ?? "",
                )}
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {state.fieldErrors.siteVendorHint ? (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.siteVendorHint}
                </p>
              ) : null}
            </label>

            <div className="sm:col-span-2">
              <SubmitButton idleLabel="Save Website" pendingLabel="Saving..." />
            </div>
          </form>

          <form action={deleteAction}>
            <SubmitButton
              idleLabel="Move to Trash"
              pendingLabel="Moving..."
              className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            />
          </form>
        </>
      ) : (
        <div className="space-y-2 text-sm text-black/75 dark:text-white/75">
          <p>Vendor Hint: {bookmark.siteVendorHint ?? "N/A"}</p>
          <p>Website URL: {bookmark.siteUrl ?? "N/A"}</p>
        </div>
      )}
    </article>
  );
}

export function BookmarkCard({ bookmark, canMutate }: BookmarkCardProps) {
  if (bookmark.kind === "SITE") {
    return <SiteBookmarkCard bookmark={bookmark} canMutate={canMutate} />;
  }

  return <TemplateBookmarkCard bookmark={bookmark} canMutate={canMutate} />;
}
