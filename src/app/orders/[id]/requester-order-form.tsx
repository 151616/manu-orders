"use client";

import { Order } from "@prisma/client";
import { useActionState } from "react";
import { updateOrderRequesterFields } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
} from "@/lib/order-domain";

type RequesterOrderFormProps = {
  order: Order;
};

export function RequesterOrderForm({ order }: RequesterOrderFormProps) {
  const updateAction = updateOrderRequesterFields.bind(null, order.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);
  const valueFor = (field: string, fallback: string) =>
    state.submittedValues[field] ?? fallback;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight text-black">Requester Fields</h2>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Title</span>
          <input
            name="title"
            defaultValue={valueFor("title", order.title)}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.title ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Description</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={valueFor("description", order.description ?? "")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.description ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.description}
            </p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Requester Name</span>
          <input
            name="requesterName"
            defaultValue={valueFor("requesterName", order.requesterName)}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.requesterName ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.requesterName}
            </p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Vendor</span>
          <input
            name="vendor"
            defaultValue={valueFor("vendor", order.vendor ?? "")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.vendor ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.vendor}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Order Number</span>
          <input
            name="orderNumber"
            defaultValue={valueFor("orderNumber", order.orderNumber ?? "")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.orderNumber ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.orderNumber}
            </p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Order URL</span>
          <input
            name="orderUrl"
            defaultValue={valueFor("orderUrl", order.orderUrl ?? "")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.orderUrl ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.orderUrl}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Quantity</span>
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={valueFor("quantity", order.quantity?.toString() ?? "")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.quantity ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.quantity}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Category</span>
          <select
            name="category"
            defaultValue={valueFor("category", order.category)}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {ORDER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {ORDER_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          {state.fieldErrors.category ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.category}</p>
          ) : null}
        </label>
      </div>

      <SubmitButton idleLabel="Save Requester Fields" pendingLabel="Saving..." />
    </form>
  );
}
