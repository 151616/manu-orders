"use client";

import { useActionState } from "react";
import { createBookmark } from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
} from "@/lib/order-domain";

export function CreateBookmarkForm() {
  const [state, formAction] = useActionState(createBookmark, EMPTY_FORM_STATE);
  const valueFor = (field: string, fallback: string = "") =>
    state.submittedValues[field] ?? fallback;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight text-black">Create Bookmark</h2>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Name</span>
          <input
            name="name"
            defaultValue={valueFor("name")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.name ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">
            Default Vendor
          </span>
          <input
            name="defaultVendor"
            defaultValue={valueFor("defaultVendor")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.defaultVendor ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.defaultVendor}
            </p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">
            Default Category
          </span>
          <select
            name="defaultCategory"
            defaultValue={valueFor("defaultCategory")}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
          <span className="mb-1 block text-sm font-medium text-black">
            Default Order URL
          </span>
          <input
            name="defaultOrderUrl"
            defaultValue={valueFor("defaultOrderUrl")}
            placeholder="https://"
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.defaultOrderUrl ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.defaultOrderUrl}
            </p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">
            Default Description
          </span>
          <textarea
            name="defaultDescription"
            rows={3}
            defaultValue={valueFor("defaultDescription")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.defaultDescription ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.defaultDescription}
            </p>
          ) : null}
        </label>
      </div>

      <SubmitButton idleLabel="Create Bookmark" pendingLabel="Creating..." />
    </form>
  );
}
