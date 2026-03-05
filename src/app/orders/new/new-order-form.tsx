"use client";

import { useActionState } from "react";
import { createOrder } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
} from "@/lib/order-domain";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type NewOrderDefaults = {
  title: string;
  description: string;
  requesterName: string;
  requesterContact: string;
  vendor: string;
  orderNumber: string;
  orderUrl: string;
  quantity: string;
  category: string;
};

type NewOrderFormProps = {
  defaults: NewOrderDefaults;
};

export function NewOrderForm({ defaults }: NewOrderFormProps) {
  const [state, formAction] = useActionState(createOrder, EMPTY_FORM_STATE);
  const valueFor = (field: keyof NewOrderDefaults) =>
    state.submittedValues[field] ?? defaults[field];

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black">Create New Order</h1>
        <p className="text-sm text-black/65">
          Admins can set requester fields here. Manufacturing fields start with defaults.
        </p>
      </div>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Title</span>
          <input
            name="title"
            defaultValue={valueFor("title")}
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
            defaultValue={valueFor("description")}
            rows={4}
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
            defaultValue={valueFor("requesterName")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.requesterName ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.requesterName}
            </p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">
            Requester Contact
          </span>
          <input
            name="requesterContact"
            defaultValue={valueFor("requesterContact")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.requesterContact ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.requesterContact}
            </p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Vendor</span>
          <input
            name="vendor"
            defaultValue={valueFor("vendor")}
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
            defaultValue={valueFor("orderNumber")}
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
            defaultValue={valueFor("orderUrl")}
            placeholder="https://"
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
            defaultValue={valueFor("quantity")}
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
            defaultValue={valueFor("category")}
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

      <SubmitButton idleLabel="Create Order" pendingLabel="Creating..." />
    </form>
  );
}
