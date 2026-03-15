"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSiteBookmark,
  createTemplateBookmark,
} from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
} from "@/lib/order-domain";

function useValueFor(
  submittedValues: Record<string, string>,
  field: string,
  fallback: string = "",
) {
  return submittedValues[field] ?? fallback;
}

export function CreateBookmarkForm() {
  const router = useRouter();
  const [siteState, siteAction] = useActionState(
    createSiteBookmark,
    EMPTY_FORM_STATE,
  );
  const [templateState, templateAction] = useActionState(
    createTemplateBookmark,
    EMPTY_FORM_STATE,
  );
  const [siteFormKey, setSiteFormKey] = useState(0);
  const [templateFormKey, setTemplateFormKey] = useState(0);

  useEffect(() => {
    if (siteState.success) {
      setSiteFormKey((k) => k + 1);
      router.refresh();
    } else if (siteState.error) {
      console.error("[ManuQueue Bookmark Debug] createSiteBookmark failed", {
        error: siteState.error,
        fieldErrors: siteState.fieldErrors,
        submittedValues: siteState.submittedValues,
        at: new Date().toISOString(),
      });
    }
  }, [siteState, router]);

  useEffect(() => {
    if (templateState.success) {
      setTemplateFormKey((k) => k + 1);
      router.refresh();
    }
  }, [templateState, router]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        key={siteFormKey}
        action={siteAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5"
      >
        <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">
          Add Website Bookmark
        </h2>

        {siteState.success ? <FormMessage tone="success" message={siteState.success} /> : null}
        {siteState.error ? <FormMessage tone="error" message={siteState.error} /> : null}

        <div className="grid gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">Website URL</span>
            <input
              name="siteUrl"
              defaultValue={useValueFor(siteState.submittedValues, "siteUrl")}
              placeholder="https://"
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {siteState.fieldErrors.siteUrl ? (
              <p className="mt-1 text-xs text-red-600">{siteState.fieldErrors.siteUrl}</p>
            ) : null}
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">Name</span>
            <input
              name="name"
              defaultValue={useValueFor(siteState.submittedValues, "name")}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {siteState.fieldErrors.name ? (
              <p className="mt-1 text-xs text-red-600">{siteState.fieldErrors.name}</p>
            ) : null}
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">Vendor Hint</span>
            <input
              name="siteVendorHint"
              defaultValue={useValueFor(siteState.submittedValues, "siteVendorHint")}
              placeholder="Optional"
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {siteState.fieldErrors.siteVendorHint ? (
              <p className="mt-1 text-xs text-red-600">{siteState.fieldErrors.siteVendorHint}</p>
            ) : null}
          </label>
        </div>

        <SubmitButton idleLabel="Create Website Bookmark" pendingLabel="Creating..." />
      </form>

      <form
        key={templateFormKey}
        action={templateAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5"
      >
        <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">
          Add Template Bookmark
        </h2>

        {templateState.success ? (
          <FormMessage tone="success" message={templateState.success} />
        ) : null}
        {templateState.error ? (
          <FormMessage tone="error" message={templateState.error} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">Name</span>
            <input
              name="name"
              defaultValue={useValueFor(templateState.submittedValues, "name")}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {templateState.fieldErrors.name ? (
              <p className="mt-1 text-xs text-red-600">{templateState.fieldErrors.name}</p>
            ) : null}
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">
              Default Vendor
            </span>
            <input
              name="defaultVendor"
              defaultValue={useValueFor(templateState.submittedValues, "defaultVendor")}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {templateState.fieldErrors.defaultVendor ? (
              <p className="mt-1 text-xs text-red-600">
                {templateState.fieldErrors.defaultVendor}
              </p>
            ) : null}
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">
              Default Category
            </span>
            <select
              name="defaultCategory"
              defaultValue={useValueFor(templateState.submittedValues, "defaultCategory")}
              className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            >
              <option value="">None</option>
              {ORDER_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {ORDER_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {templateState.fieldErrors.defaultCategory ? (
              <p className="mt-1 text-xs text-red-600">
                {templateState.fieldErrors.defaultCategory}
              </p>
            ) : null}
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">
              Default Order URL
            </span>
            <input
              name="defaultOrderUrl"
              defaultValue={useValueFor(templateState.submittedValues, "defaultOrderUrl")}
              placeholder="https://"
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {templateState.fieldErrors.defaultOrderUrl ? (
              <p className="mt-1 text-xs text-red-600">
                {templateState.fieldErrors.defaultOrderUrl}
              </p>
            ) : null}
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-black dark:text-white">
              Default Description
            </span>
            <textarea
              name="defaultDescription"
              rows={3}
              defaultValue={useValueFor(templateState.submittedValues, "defaultDescription")}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {templateState.fieldErrors.defaultDescription ? (
              <p className="mt-1 text-xs text-red-600">
                {templateState.fieldErrors.defaultDescription}
              </p>
            ) : null}
          </label>
        </div>

        <SubmitButton idleLabel="Create Template Bookmark" pendingLabel="Creating..." />
      </form>
    </div>
  );
}
