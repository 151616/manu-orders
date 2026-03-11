"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createManuRequest, finishManuRequest } from "./actions";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type ManuRequestType = "CNC" | "DRILL" | "TAP" | "CUT" | "OTHER";

const TYPE_LABELS: Record<ManuRequestType, string> = {
  CNC: "CNC",
  DRILL: "Drill",
  TAP: "Tap",
  CUT: "Cut",
  OTHER: "Other",
};

const TYPE_COLORS: Record<ManuRequestType, string> = {
  CNC: "bg-blue-100 text-blue-800",
  DRILL: "bg-orange-100 text-orange-800",
  TAP: "bg-purple-100 text-purple-800",
  CUT: "bg-red-100 text-red-800",
  OTHER: "bg-slate-100 text-slate-700",
};

export type ManuRequestItem = {
  id: string;
  title: string;
  description: string | null;
  type: ManuRequestType;
  otherType: string | null;
  fileOriginalName: string | null;
  fileUrl: string | null;
  createdAt: Date;
};

type TrackingClientProps = {
  isAdmin: boolean;
  requests: ManuRequestItem[];
};

function AddRequestForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createManuRequest,
    EMPTY_FORM_STATE,
  );
  const [selectedType, setSelectedType] = useState<ManuRequestType>("CNC");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setSelectedType("CNC");
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-black">New Request</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-black/50 hover:text-black"
        >
          Cancel
        </button>
      </div>

      {state.error ? (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black">
            Title <span className="text-red-500">*</span>
          </span>
          <input
            name="title"
            defaultValue={state.submittedValues.title ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          />
          {state.fieldErrors.title ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.title}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black">
            Description
          </span>
          <textarea
            name="description"
            defaultValue={state.submittedValues.description ?? ""}
            rows={3}
            disabled={isPending}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 resize-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black">
            Type <span className="text-red-500">*</span>
          </span>
          <select
            name="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ManuRequestType)}
            disabled={isPending}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            <option value="CNC">CNC</option>
            <option value="DRILL">Drill</option>
            <option value="TAP">Tap</option>
            <option value="CUT">Cut</option>
            <option value="OTHER">Other</option>
          </select>
          {state.fieldErrors.type ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.type}</p>
          ) : null}
        </label>

        {selectedType === "OTHER" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black">
              Describe the type <span className="text-red-500">*</span>
            </span>
            <input
              name="otherType"
              defaultValue={state.submittedValues.otherType ?? ""}
              disabled={isPending}
              placeholder="e.g. Weld, Sand, Polish..."
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            />
            {state.fieldErrors.otherType ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.otherType}
              </p>
            ) : null}
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black">
            CNC File{" "}
            <span className="font-normal text-black/50">(optional)</span>
          </span>
          <input
            name="cncFile"
            type="file"
            disabled={isPending}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-black hover:file:bg-slate-200 disabled:opacity-60"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-black/70 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/85 disabled:opacity-60"
        >
          {isPending ? "Adding..." : "Add Request"}
        </button>
      </div>
    </form>
  );
}

function RequestCard({
  request,
  isAdmin,
}: {
  request: ManuRequestItem;
  isAdmin: boolean;
}) {
  const [finishing, setFinishing] = useState(false);

  const typeLabel =
    request.type === "OTHER" && request.otherType
      ? request.otherType
      : TYPE_LABELS[request.type];

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    await finishManuRequest(request.id);
    setFinishing(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[request.type]}`}
          >
            {typeLabel}
          </span>
          <h3 className="text-sm font-semibold text-black">{request.title}</h3>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {finishing ? "Finishing..." : "Mark Done"}
          </button>
        ) : null}
      </div>

      {request.description ? (
        <p className="text-sm text-black/70 leading-relaxed">
          {request.description}
        </p>
      ) : null}

      {request.fileUrl && request.fileOriginalName ? (
        <a
          href={request.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-black/80 hover:bg-slate-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5 shrink-0"
          >
            <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
            <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
          </svg>
          {request.fileOriginalName}
        </a>
      ) : null}

      <p className="text-xs text-black/40">
        {new Date(request.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

export function TrackingClient({ isAdmin, requests }: TrackingClientProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Manu Tracking
          </h1>
          <p className="text-sm text-black/55 mt-0.5">
            {requests.length === 0
              ? "No active requests."
              : `${requests.length} active request${requests.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {isAdmin && !showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
          >
            + Add New Request
          </button>
        ) : null}
      </div>

      {showForm ? (
        <AddRequestForm onClose={() => setShowForm(false)} />
      ) : null}

      {requests.length === 0 && !showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-black/50">No active requests right now.</p>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-black underline underline-offset-2 hover:no-underline"
            >
              Add the first one
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
