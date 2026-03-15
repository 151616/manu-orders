"use client";

import { Order } from "@prisma/client";
import { useActionState } from "react";
import { updateOrderManufacturingFields } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsInput } from "@/components/priority-stars-input";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/order-domain";

type ManufacturingOrderFormProps = {
  order: Order;
  defaultEtaDays: number;
};

export function ManufacturingOrderForm({
  order,
  defaultEtaDays,
}: ManufacturingOrderFormProps) {
  const updateAction = updateOrderManufacturingFields.bind(null, order.id);
  const [state, formAction] = useActionState(updateAction, EMPTY_FORM_STATE);
  const valueFor = (field: string, fallback: string) =>
    state.submittedValues[field] ?? fallback;
  const submittedPriority = Number.parseInt(
    state.submittedValues.priority ?? "",
    10,
  );
  const priorityDefaultValue = Number.isInteger(submittedPriority)
    ? submittedPriority
    : order.priority;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5"
    >
      <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">Manufacturing Fields</h2>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-black dark:text-white">Priority</span>
          <PriorityStarsInput name="priority" defaultValue={priorityDefaultValue} />
          {state.fieldErrors.priority ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.priority}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black dark:text-white">ETA Days</span>
          <input
            name="etaDays"
            type="number"
            min={0}
            defaultValue={valueFor("etaDays", defaultEtaDays.toString())}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
          {state.fieldErrors.etaDays ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.etaDays}</p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black dark:text-white">Status</span>
          <select
            name="status"
            defaultValue={valueFor("status", order.status)}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {state.fieldErrors.status ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.status}</p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black dark:text-white">
            Manufacturing Notes
          </span>
          <textarea
            name="notesFromManu"
            defaultValue={valueFor("notesFromManu", order.notesFromManu ?? "")}
            rows={4}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
          {state.fieldErrors.notesFromManu ? (
            <p className="mt-1 text-xs text-red-600">
              {state.fieldErrors.notesFromManu}
            </p>
          ) : null}
        </label>
      </div>

      <SubmitButton idleLabel="Save Manufacturing Fields" pendingLabel="Saving..." />
    </form>
  );
}
