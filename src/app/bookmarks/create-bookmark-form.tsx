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

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold text-black">Create Bookmark</h2>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Name</span>
          <input
            name="name"
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
            defaultValue=""
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
          <span className="mb-1 block text-sm font-medium text-black">
            Default Order URL
          </span>
          <input
            name="defaultOrderUrl"
            placeholder="https://"
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
