"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createOrderRequest } from "@/app/requests/actions";
import { PriorityStarsInput } from "@/components/priority-stars-input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type ProductAutofillResponse = {
  normalizedUrl: string;
  title: string;
  description: string;
  vendor: string;
  category: string;
  source: "jsonld" | "meta" | "rev-heuristic" | "mixed";
  confidence: "high" | "medium" | "low";
};

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const PRODUCT_PREVIEW_TIMEOUT_MS = 15000;

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (URL_SCHEME_REGEX.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function NewOrderRequestForm({ onSuccess, onCancel }: Props) {
  const [state, formAction] = useActionState(createOrderRequest, EMPTY_FORM_STATE);
  const [formKey, setFormKey] = useState(0);
  const [autofillStatus, setAutofillStatus] = useState<
    "idle" | "loading" | "ready" | "applied" | "error"
  >("idle");
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillSuggestion, setAutofillSuggestion] =
    useState<ProductAutofillResponse | null>(null);

  const extractRequestIdRef = useRef(0);
  const extractAbortRef = useRef<AbortController | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const vendorInputRef = useRef<HTMLInputElement | null>(null);
  const categorySelectRef = useRef<HTMLSelectElement | null>(null);
  const orderUrlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setAutofillStatus("idle");
      setAutofillMessage("");
      setAutofillSuggestion(null);
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  useEffect(() => {
    return () => {
      if (extractAbortRef.current) extractAbortRef.current.abort();
    };
  }, []);

  const clearAutofillResult = useCallback(() => {
    setAutofillStatus("idle");
    setAutofillMessage("");
    setAutofillSuggestion(null);
  }, []);

  const fetchProductAutofill = useCallback(async (rawUrl: string) => {
    const normalized = normalizeUrlInput(rawUrl);
    if (!normalized) {
      setAutofillStatus("idle");
      setAutofillMessage("");
      setAutofillSuggestion(null);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalized);
    } catch {
      setAutofillStatus("error");
      setAutofillMessage("Enter a valid URL to fetch product details.");
      setAutofillSuggestion(null);
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setAutofillStatus("error");
      setAutofillMessage("Only HTTP(S) URLs are supported.");
      setAutofillSuggestion(null);
      return;
    }

    if (extractAbortRef.current) extractAbortRef.current.abort();

    const abortController = new AbortController();
    extractAbortRef.current = abortController;
    const requestOrdinal = extractRequestIdRef.current + 1;
    extractRequestIdRef.current = requestOrdinal;

    setAutofillStatus("loading");
    setAutofillMessage("Extracting product metadata...");
    setAutofillSuggestion(null);

    const timeoutId = window.setTimeout(() => {
      abortController.abort("preview-timeout");
    }, PRODUCT_PREVIEW_TIMEOUT_MS);

    try {
      const response = await fetch("/api/product-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: abortController.signal,
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | ProductAutofillResponse
        | null;

      if (extractRequestIdRef.current !== requestOrdinal) return;

      if (!response.ok) {
        const errorMessage =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not fetch product info for this URL.";
        setAutofillStatus("error");
        setAutofillMessage(errorMessage);
        setAutofillSuggestion(null);
        return;
      }

      if (!body || typeof body !== "object" || !("title" in body)) {
        setAutofillStatus("error");
        setAutofillMessage("No usable product metadata was found.");
        setAutofillSuggestion(null);
        return;
      }

      const parsed = body as ProductAutofillResponse;
      if (orderUrlInputRef.current) orderUrlInputRef.current.value = parsed.normalizedUrl;
      setAutofillStatus("ready");
      setAutofillMessage("Press Tab to autofill.");
      setAutofillSuggestion(parsed);
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === "AbortError";
      if (isAbortError && extractRequestIdRef.current !== requestOrdinal) return;
      setAutofillStatus("error");
      setAutofillMessage(
        isAbortError
          ? "Autofill request timed out. Try again or use a direct product URL."
          : "Failed to fetch product information.",
      );
      setAutofillSuggestion(null);
    } finally {
      window.clearTimeout(timeoutId);
      if (extractAbortRef.current === abortController) extractAbortRef.current = null;
    }
  }, []);

  const applyAutofill = useCallback(() => {
    if (!autofillSuggestion) return;
    if (titleInputRef.current) titleInputRef.current.value = autofillSuggestion.title;
    if (descriptionInputRef.current) descriptionInputRef.current.value = autofillSuggestion.description;
    if (vendorInputRef.current) vendorInputRef.current.value = autofillSuggestion.vendor;
    if (categorySelectRef.current) categorySelectRef.current.value = autofillSuggestion.category;
    if (orderUrlInputRef.current) orderUrlInputRef.current.value = autofillSuggestion.normalizedUrl;
    setAutofillStatus("applied");
    setAutofillMessage("Autofill applied. Review and press submit when ready.");
  }, [autofillSuggestion]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4"
    >
      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      {/* Order URL — top, with autofill */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
          Order URL
        </span>
        <div className="relative">
          <input
            ref={orderUrlInputRef}
            name="orderUrl"
            defaultValue={state.submittedValues.orderUrl ?? ""}
            placeholder="https://"
            onPaste={(e) => {
              const input = e.currentTarget;
              window.setTimeout(() => void fetchProductAutofill(input.value), 0);
            }}
            onBlur={(e) => void fetchProductAutofill(e.currentTarget.value)}
            onChange={() => { if (autofillStatus !== "idle") clearAutofillResult(); }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && autofillStatus === "ready") {
                e.preventDefault();
                applyAutofill();
              }
            }}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 pr-36 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
          />
          {autofillStatus === "loading" ? (
            <span className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-black dark:border-white/20 dark:border-t-white" aria-hidden="true" />
          ) : null}
          {autofillStatus === "ready" ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/35 dark:text-white/35">
              Press Tab to autofill
            </span>
          ) : null}
        </div>
        {autofillStatus === "error" ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{autofillMessage}</p>
        ) : null}
        {autofillStatus === "applied" ? (
          <p className="mt-1 text-xs text-green-700 dark:text-green-400">{autofillMessage}</p>
        ) : null}
        {autofillSuggestion && autofillStatus === "ready" ? (
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">Found: {autofillSuggestion.title}</p>
        ) : null}
      </label>

      {/* Title */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
          Title <span className="text-red-500">*</span>
        </span>
        <input
          ref={titleInputRef}
          name="title"
          defaultValue={state.submittedValues.title ?? ""}
          placeholder="e.g. #25 Chain Sprocket"
          className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
        />
        {state.fieldErrors.title ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.title}</p>
        ) : null}
      </label>

      {/* Description */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Description</span>
        <textarea
          ref={descriptionInputRef}
          name="description"
          defaultValue={state.submittedValues.description ?? ""}
          rows={2}
          placeholder="Part details, specs, notes for manufacturing..."
          className="w-full resize-none rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
        />
      </label>

      {/* Requester Name */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
          Requester Name <span className="text-red-500">*</span>
        </span>
        <input
          name="requesterName"
          defaultValue={state.submittedValues.requesterName ?? ""}
          placeholder="Your name"
          className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
        />
        {state.fieldErrors.requesterName ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.requesterName}</p>
        ) : null}
      </label>

      {/* Vendor + Category */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Vendor</span>
          <input
            ref={vendorInputRef}
            name="vendor"
            defaultValue={state.submittedValues.vendor ?? ""}
            placeholder="e.g. Rev Robotics"
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
            Category <span className="text-red-500">*</span>
          </span>
          <select
            ref={categorySelectRef}
            name="category"
            defaultValue={state.submittedValues.category ?? ""}
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
          >
            <option value="">Select category</option>
            {ORDER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{ORDER_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          {state.fieldErrors.category ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.category}</p>
          ) : null}
        </label>
      </div>

      {/* Quantity + Priority */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Quantity</span>
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={state.submittedValues.quantity ?? ""}
            placeholder="e.g. 4"
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          />
          {state.fieldErrors.quantity ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.fieldErrors.quantity}</p>
          ) : null}
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Priority</span>
          <PriorityStarsInput name="priority" defaultValue={3} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <SubmitButton>Submit Request</SubmitButton>
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
  );
}
