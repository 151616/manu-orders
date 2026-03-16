"use client";

import { useActionState, useEffect, useState } from "react";
import { createTrackingRequest } from "@/app/requests/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type ManuRequestType = "CNC" | "DRILL" | "TAP" | "CUT" | "OTHER";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function NewTrackingRequestForm({ onSuccess, onCancel }: Props = {}) {
  const [state, formAction] = useActionState(createTrackingRequest, EMPTY_FORM_STATE);
  const [formKey, setFormKey] = useState(0);
  const [selectedType, setSelectedType] = useState<ManuRequestType>("CNC");

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setSelectedType("CNC");
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          Request Tracking
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Submit a manufacturing task request. An admin will review and add it to tracking.
        </p>
      </div>

      {state.success ? (
        <FormMessage tone="success" message={state.success} />
      ) : null}

      <form
        key={formKey}
        action={formAction}
        className="space-y-4 rounded-xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
      >
        {state.error ? (
          <FormMessage tone="error" message={state.error} />
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
            Title <span className="text-red-500">*</span>
          </span>
          <input
            name="title"
            defaultValue={state.submittedValues.title ?? ""}
            placeholder="e.g. Cut 2024 aluminum extrusion to length"
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
          {state.fieldErrors.title ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.title}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
            Description
          </span>
          <textarea
            name="description"
            defaultValue={state.submittedValues.description ?? ""}
            rows={3}
            placeholder="Dimensions, tolerances, materials, or any other relevant details..."
            className="w-full resize-none rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
            Type <span className="text-red-500">*</span>
          </span>
          <select
            name="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ManuRequestType)}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
          >
            <option value="CNC">CNC</option>
            <option value="DRILL">Drill</option>
            <option value="TAP">Tap</option>
            <option value="CUT">Cut</option>
            <option value="OTHER">Other</option>
          </select>
          {state.fieldErrors.type ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.type}</p>
          ) : null}
        </label>

        {selectedType === "OTHER" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Describe the type <span className="text-red-500">*</span>
            </span>
            <input
              name="otherType"
              defaultValue={state.submittedValues.otherType ?? ""}
              placeholder="e.g. Weld, Sand, Polish..."
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {state.fieldErrors.otherType ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.otherType}</p>
            ) : null}
          </label>
        ) : null}

        <div className="flex gap-2">
          <SubmitButton idleLabel="Submit Request" />
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
