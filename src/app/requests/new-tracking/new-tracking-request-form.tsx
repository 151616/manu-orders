"use client";

import { useActionState, useEffect, useState } from "react";
import { createTrackingRequest } from "@/app/requests/actions";
import { CustomSelect } from "@/components/custom-select";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import { ROBOTS, ROBOT_LABELS, type Robot } from "@/lib/order-domain";

type ManuRequestType = "CNC" | "DRILL" | "TAP" | "CUT" | "OTHER";

type Props = {
  defaultRobot?: "GAMMA" | "LAMBDA" | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function NewTrackingRequestForm({ defaultRobot, onSuccess, onCancel }: Props = {}) {
  const [state, formAction] = useActionState(createTrackingRequest, EMPTY_FORM_STATE);
  const [formKey, setFormKey] = useState(0);
  const [selectedType, setSelectedType] = useState<ManuRequestType>("CNC");
  const [selectedRobot, setSelectedRobot] = useState<Robot | "">(defaultRobot ?? "");

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setSelectedType("CNC");
      setSelectedRobot(defaultRobot ?? "");
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
        className="space-y-4 rounded-xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
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
            className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
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
            className="w-full resize-none rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
            Type <span className="text-red-500">*</span>
          </span>
          <CustomSelect
            name="type"
            value={selectedType}
            onChange={(v) => setSelectedType(v as ManuRequestType)}
            options={[
              { value: "CNC", label: "CNC" },
              { value: "DRILL", label: "Drill" },
              { value: "TAP", label: "Tap" },
              { value: "CUT", label: "Cut" },
              { value: "OTHER", label: "Other" },
            ]}
          />
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
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {state.fieldErrors.otherType ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.otherType}</p>
            ) : null}
          </label>
        ) : null}

        {defaultRobot ? (
          <>
            <input type="hidden" name="robot" value={defaultRobot} />
            <div>
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Robot</span>
              <p className="rounded-md border border-zinc-300/80 bg-zinc-50 px-3 py-2 text-sm text-black/70 dark:border-white/20 dark:bg-white/5 dark:text-white/70">
                {ROBOT_LABELS[defaultRobot]}
              </p>
            </div>
          </>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Robot
            </span>
            <CustomSelect
              name="robot"
              value={selectedRobot}
              onChange={(v) => setSelectedRobot(v as Robot | "")}
              options={[
                { value: "", label: "Unassigned" },
                ...ROBOTS.map((r) => ({ value: r, label: ROBOT_LABELS[r] })),
              ]}
            />
          </label>
        )}

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
