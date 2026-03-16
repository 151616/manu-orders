"use client";

import Link from "next/link";
import { Bookmark } from "@prisma/client";
import { useActionState } from "react";
import {
  deleteBookmark,
  updateSiteBookmarkLink,
  updateTemplateBookmarkLink,
} from "@/app/bookmarks/actions";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type BookmarkCardProps = {
  bookmark: Bookmark;
  canMutate: boolean;
};

const inputCls =
  "min-w-0 flex-1 rounded-md border border-slate-300/80 px-2.5 py-1.5 text-xs text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10";

const saveBtnCls =
  "shrink-0 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

const deleteBtnCls =
  "shrink-0 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-900/20";

function SiteBookmarkRow({ bookmark, canMutate }: BookmarkCardProps) {
  const updateAction = updateSiteBookmarkLink.bind(null, bookmark.id);
  const deleteAction = deleteBookmark.bind(null, bookmark.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);

  const currentUrl = state.submittedValues.siteUrl ?? bookmark.siteUrl ?? "";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
        Site
      </span>
      <span className="w-32 shrink-0 truncate text-sm font-medium text-black dark:text-white">
        {bookmark.name}
      </span>

      {canMutate ? (
        <>
          <form action={formAction} className="flex min-w-[12rem] flex-1 items-center gap-2">
            <input
              name="siteUrl"
              defaultValue={currentUrl}
              placeholder="https://..."
              className={inputCls}
            />
            <SubmitButton idleLabel="Save" pendingLabel="..." className={saveBtnCls} />
          </form>
          <form action={deleteAction}>
            <button type="submit" className={deleteBtnCls}>
              Delete
            </button>
          </form>
          {bookmark.siteUrl ? (
            <a
              href={bookmark.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
              title="Open site"
            >
              ↗
            </a>
          ) : null}
          {state.success ? (
            <span className="w-full text-xs text-green-600 dark:text-green-400">{state.success}</span>
          ) : state.error ? (
            <span className="w-full text-xs text-red-600 dark:text-red-400">{state.error}</span>
          ) : null}
        </>
      ) : (
        bookmark.siteUrl ? (
          <a
            href={bookmark.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400"
          >
            {bookmark.siteUrl}
          </a>
        ) : (
          <span className="min-w-0 flex-1 text-xs text-black/40 dark:text-white/40">No URL set</span>
        )
      )}
    </li>
  );
}

function TemplateBookmarkRow({ bookmark, canMutate }: BookmarkCardProps) {
  const updateAction = updateTemplateBookmarkLink.bind(null, bookmark.id);
  const deleteAction = deleteBookmark.bind(null, bookmark.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);

  const currentUrl = state.submittedValues.defaultOrderUrl ?? bookmark.defaultOrderUrl ?? "";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
        Tmpl
      </span>
      <span className="w-32 shrink-0 truncate text-sm font-medium text-black dark:text-white">
        {bookmark.name}
      </span>

      {canMutate ? (
        <>
          <form action={formAction} className="flex min-w-[12rem] flex-1 items-center gap-2">
            <input
              name="defaultOrderUrl"
              defaultValue={currentUrl}
              placeholder="https://..."
              className={inputCls}
            />
            <SubmitButton idleLabel="Save" pendingLabel="..." className={saveBtnCls} />
          </form>
          <Link
            href={`/orders/new?fromBookmark=${bookmark.id}`}
            className="shrink-0 rounded-md border border-black/15 px-2.5 py-1.5 text-xs font-semibold text-black/70 hover:border-black/25 hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
          >
            Use
          </Link>
          <form action={deleteAction}>
            <button type="submit" className={deleteBtnCls}>
              Delete
            </button>
          </form>
          {state.success ? (
            <span className="w-full text-xs text-green-600 dark:text-green-400">{state.success}</span>
          ) : state.error ? (
            <span className="w-full text-xs text-red-600 dark:text-red-400">{state.error}</span>
          ) : null}
        </>
      ) : (
        bookmark.defaultOrderUrl ? (
          <a
            href={bookmark.defaultOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400"
          >
            {bookmark.defaultOrderUrl}
          </a>
        ) : (
          <span className="min-w-0 flex-1 text-xs text-black/40 dark:text-white/40">No URL set</span>
        )
      )}
    </li>
  );
}

export function BookmarkCard({ bookmark, canMutate }: BookmarkCardProps) {
  if (bookmark.kind === "SITE") {
    return <SiteBookmarkRow bookmark={bookmark} canMutate={canMutate} />;
  }
  return <TemplateBookmarkRow bookmark={bookmark} canMutate={canMutate} />;
}
