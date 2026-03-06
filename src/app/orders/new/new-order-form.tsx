"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createOrder } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsInput } from "@/components/priority-stars-input";
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
  priority: number;
  etaDays: string;
  vendor: string;
  orderNumber: string;
  orderUrl: string;
  quantity: string;
  category: string;
};

type NewOrderFormProps = {
  defaults: NewOrderDefaults;
  initialVendorLaunchUrl?: string | null;
};

type ProductAutofillResponse = {
  normalizedUrl: string;
  title: string;
  description: string;
  vendor: string;
  category: string;
  source: "jsonld" | "meta" | "rev-heuristic" | "mixed";
  confidence: "high" | "medium" | "low";
};

type EmbedCheckResponse = {
  normalizedUrl: string;
  finalUrl: string;
  mode: "iframe" | "external";
  embeddable: boolean;
  reason: string;
};

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (URL_SCHEME_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

function isHttpProtocol(url: URL) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function extractionSourceLabel(source: ProductAutofillResponse["source"]) {
  if (source === "jsonld") return "JSON-LD";
  if (source === "rev-heuristic") return "REV Heuristic";
  if (source === "mixed") return "Mixed";
  return "Meta Tags";
}

function extractionConfidenceLabel(
  confidence: ProductAutofillResponse["confidence"],
) {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

export function NewOrderForm({
  defaults,
  initialVendorLaunchUrl,
}: NewOrderFormProps) {
  const [state, formAction] = useActionState(createOrder, EMPTY_FORM_STATE);
  const [vendorLaunchUrl, setVendorLaunchUrl] = useState(
    initialVendorLaunchUrl ?? defaults.orderUrl ?? "",
  );
  const [activeVendorUrl, setActiveVendorUrl] = useState("");
  const [vendorMode, setVendorMode] = useState<"idle" | "iframe" | "external">(
    "idle",
  );
  const [vendorStatus, setVendorStatus] = useState<
    "idle" | "checking" | "ready" | "error"
  >("idle");
  const [vendorMessage, setVendorMessage] = useState("");
  const [autofillStatus, setAutofillStatus] = useState<
    "idle" | "loading" | "ready" | "applied" | "error"
  >("idle");
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillSuggestion, setAutofillSuggestion] =
    useState<ProductAutofillResponse | null>(null);
  const embedRequestIdRef = useRef(0);
  const embedAbortRef = useRef<AbortController | null>(null);
  const extractRequestIdRef = useRef(0);
  const extractAbortRef = useRef<AbortController | null>(null);
  const autoLaunchHandledRef = useRef(false);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const vendorInputRef = useRef<HTMLInputElement | null>(null);
  const categorySelectRef = useRef<HTMLSelectElement | null>(null);
  const orderUrlInputRef = useRef<HTMLInputElement | null>(null);

  const valueFor = (field: keyof NewOrderDefaults) =>
    state.submittedValues[field] ?? defaults[field];
  const submittedPriority = Number.parseInt(
    state.submittedValues.priority ?? "",
    10,
  );
  const priorityDefaultValue = Number.isInteger(submittedPriority)
    ? submittedPriority
    : defaults.priority;

  const clearAutofillResult = useCallback(() => {
    setAutofillStatus("idle");
    setAutofillMessage("");
    setAutofillSuggestion(null);
  }, []);

  const resolveLaunchTarget = useCallback(() => {
    const fromLaunchInput = normalizeUrlInput(vendorLaunchUrl);
    if (fromLaunchInput) {
      return fromLaunchInput;
    }

    const fromOrderField = normalizeUrlInput(orderUrlInputRef.current?.value ?? "");
    if (fromOrderField) {
      return fromOrderField;
    }

    return "";
  }, [vendorLaunchUrl]);

  const runEmbedCheck = useCallback(
    async (overrideUrl?: string) => {
      const nextTarget = normalizeUrlInput(overrideUrl ?? resolveLaunchTarget());
      if (!nextTarget) {
        setVendorStatus("error");
        setVendorMode("idle");
        setVendorMessage("Enter a valid URL before opening a vendor site.");
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(nextTarget);
      } catch {
        setVendorStatus("error");
        setVendorMode("idle");
        setVendorMessage("Enter a valid URL before opening a vendor site.");
        return;
      }

      if (!isHttpProtocol(parsed)) {
        setVendorStatus("error");
        setVendorMode("idle");
        setVendorMessage("Only HTTP(S) URLs are supported.");
        return;
      }

      if (embedAbortRef.current) {
        embedAbortRef.current.abort();
      }
      const abortController = new AbortController();
      embedAbortRef.current = abortController;

      const requestId = embedRequestIdRef.current + 1;
      embedRequestIdRef.current = requestId;

      setVendorStatus("checking");
      setVendorMode("idle");
      setVendorMessage("Checking embed support...");
      setVendorLaunchUrl(nextTarget);
      clearAutofillResult();

      try {
        const response = await fetch("/api/vendor/embed-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: nextTarget }),
          signal: abortController.signal,
        });
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | EmbedCheckResponse
          | null;

        if (embedRequestIdRef.current !== requestId) {
          return;
        }

        if (!response.ok) {
          const errorMessage =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "Unable to open vendor URL.";
          setVendorStatus("error");
          setVendorMode("idle");
          setVendorMessage(errorMessage);
          return;
        }

        if (!body || typeof body !== "object" || !("mode" in body)) {
          setVendorStatus("error");
          setVendorMode("idle");
          setVendorMessage("Could not verify vendor launch mode.");
          return;
        }

        const result = body as EmbedCheckResponse;
        const resolvedUrl = result.finalUrl || result.normalizedUrl;
        setVendorLaunchUrl(resolvedUrl);
        setActiveVendorUrl(resolvedUrl);
        setVendorMode(result.mode);
        setVendorStatus("ready");
        if (result.mode === "iframe") {
          setVendorMessage(
            "Embedded mode active. Browse below, then click Next: Extract.",
          );
        } else {
          setVendorMessage(
            `${result.reason} Continue in a new tab, then click Next: Extract.`,
          );
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setVendorStatus("error");
        setVendorMode("idle");
        setVendorMessage(
          error instanceof Error
            ? error.message
            : "Could not open this vendor URL.",
        );
      }
    },
    [clearAutofillResult, resolveLaunchTarget],
  );

  const openVendorInNewTab = useCallback(() => {
    const nextTarget = normalizeUrlInput(resolveLaunchTarget());
    if (!nextTarget) {
      setVendorStatus("error");
      setVendorMode("idle");
      setVendorMessage("Enter a valid URL before opening a new tab.");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(nextTarget);
    } catch {
      setVendorStatus("error");
      setVendorMode("idle");
      setVendorMessage("Enter a valid URL before opening a new tab.");
      return;
    }

    if (!isHttpProtocol(parsed)) {
      setVendorStatus("error");
      setVendorMode("idle");
      setVendorMessage("Only HTTP(S) URLs are supported.");
      return;
    }

    window.open(nextTarget, "_blank", "noopener,noreferrer");
    setVendorLaunchUrl(nextTarget);
    setActiveVendorUrl(nextTarget);
    setVendorMode("external");
    setVendorStatus("ready");
    setVendorMessage(
      "Opened in a new tab. Finish selecting your product, then click Next: Extract.",
    );
  }, [resolveLaunchTarget]);

  useEffect(() => {
    return () => {
      if (embedAbortRef.current) {
        embedAbortRef.current.abort();
      }
      if (extractAbortRef.current) {
        extractAbortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (autoLaunchHandledRef.current) {
      return;
    }

    const seedUrl = normalizeUrlInput(initialVendorLaunchUrl ?? "");
    if (!seedUrl) {
      return;
    }

    autoLaunchHandledRef.current = true;
    const timeoutId = setTimeout(() => {
      void runEmbedCheck(seedUrl);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialVendorLaunchUrl, runEmbedCheck]);

  const fetchProductAutofill = useCallback(async () => {
    const normalized = normalizeUrlInput(activeVendorUrl || resolveLaunchTarget());
    if (!normalized) {
      setAutofillStatus("error");
      setAutofillMessage("Enter a valid URL before extraction.");
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

    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
    }

    const abortController = new AbortController();
    extractAbortRef.current = abortController;

    const requestId = extractRequestIdRef.current + 1;
    extractRequestIdRef.current = requestId;

    setAutofillStatus("loading");
    setAutofillMessage("Extracting product metadata...");
    setAutofillSuggestion(null);

    try {
      const response = await fetch("/api/product-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalized }),
        signal: abortController.signal,
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | ProductAutofillResponse
        | null;

      if (extractRequestIdRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        const errorMessage =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
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
      setVendorLaunchUrl(parsed.normalizedUrl);
      setActiveVendorUrl(parsed.normalizedUrl);
      setAutofillStatus("ready");
      setAutofillMessage("Preview ready. Click Apply Autofill to overwrite fields.");
      setAutofillSuggestion(parsed);
    } catch {
      if (abortController.signal.aborted) {
        return;
      }

      setAutofillStatus("error");
      setAutofillMessage("Failed to fetch product information.");
      setAutofillSuggestion(null);
    }
  }, [activeVendorUrl, resolveLaunchTarget]);

  const applyAutofill = useCallback(() => {
    if (!autofillSuggestion) {
      return;
    }

    if (titleInputRef.current) {
      titleInputRef.current.value = autofillSuggestion.title;
    }
    if (descriptionInputRef.current) {
      descriptionInputRef.current.value = autofillSuggestion.description;
    }
    if (vendorInputRef.current) {
      vendorInputRef.current.value = autofillSuggestion.vendor;
    }
    if (categorySelectRef.current) {
      categorySelectRef.current.value = autofillSuggestion.category;
    }
    if (orderUrlInputRef.current) {
      orderUrlInputRef.current.value = autofillSuggestion.normalizedUrl;
    }

    setAutofillStatus("applied");
    setAutofillMessage("Autofill applied. Review and press submit when ready.");
  }, [autofillSuggestion]);

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

      <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-black">Vendor Browser</h2>
          <p className="text-xs text-black/65">
            Open a vendor site, then run extraction with Preview -&gt; Apply Autofill -&gt;
            Submit.
          </p>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={vendorLaunchUrl}
            onChange={(event) => {
              setVendorLaunchUrl(event.currentTarget.value);
              setVendorStatus("idle");
              setVendorMessage("");
            }}
            placeholder="https://vendor.example/product"
            className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            onClick={() => void runEmbedCheck()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={vendorStatus === "checking"}
          >
            {vendorStatus === "checking" ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-black"
                aria-hidden="true"
              />
            ) : null}
            Open
          </button>
          <button
            type="button"
            onClick={openVendorInNewTab}
            className="rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-black/5"
          >
            Open in New Tab
          </button>
          <button
            type="button"
            onClick={() => void fetchProductAutofill()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-black bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={autofillStatus === "loading"}
          >
            {autofillStatus === "loading" ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
            ) : null}
            Next: Extract
          </button>
        </div>

        {vendorMessage ? (
          <p
            className={
              vendorStatus === "error"
                ? "text-xs text-red-600"
                : "text-xs text-black/70"
            }
          >
            {vendorMessage}
          </p>
        ) : null}

        {vendorMode === "iframe" && activeVendorUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <iframe
              key={activeVendorUrl}
              src={activeVendorUrl}
              title="Vendor Browser"
              className="h-[26rem] w-full"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        ) : null}

        {vendorMode === "external" && activeVendorUrl ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            This vendor cannot be embedded reliably. Continue in a new tab, then keep or paste
            the final page URL and run <span className="font-semibold">Next: Extract</span>.
          </div>
        ) : null}

        {autofillSuggestion ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-black">Extraction Preview</h3>
              <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-black/75">
                {extractionConfidenceLabel(autofillSuggestion.confidence)}
              </span>
            </div>

            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-black/70">Title</dt>
                <dd className="text-black">{autofillSuggestion.title || "N/A"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black/70">Vendor</dt>
                <dd className="text-black">{autofillSuggestion.vendor || "N/A"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-black/70">Description</dt>
                <dd className="text-black">{autofillSuggestion.description || "N/A"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-black/70">Category</dt>
                <dd className="text-black">{autofillSuggestion.category || "OTHER"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-black/70">URL</dt>
                <dd className="break-all text-black">{autofillSuggestion.normalizedUrl}</dd>
              </div>
            </dl>

            <p className="text-[11px] text-black/60">
              Source: {extractionSourceLabel(autofillSuggestion.source)}. Please review values
              before submission.
            </p>

            <button
              type="button"
              onClick={applyAutofill}
              className="rounded-md border border-black/20 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/5"
            >
              Apply Autofill
            </button>
          </div>
        ) : null}

        {autofillStatus === "error" ? (
          <p className="text-xs text-red-600">{autofillMessage}</p>
        ) : null}
        {autofillStatus === "applied" ? (
          <p className="text-xs text-green-700">{autofillMessage}</p>
        ) : null}
        {autofillStatus === "ready" ? (
          <p className="text-xs text-black/70">{autofillMessage}</p>
        ) : null}
      </section>

      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-black">Order URL</span>
          <div className="relative">
            <input
              ref={orderUrlInputRef}
              name="orderUrl"
              defaultValue={valueFor("orderUrl")}
              placeholder="https://"
              onChange={() => {
                if (autofillStatus !== "idle") {
                  clearAutofillResult();
                }
              }}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 pr-10 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            {autofillStatus === "loading" ? (
              <span
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-black"
                aria-hidden="true"
              />
            ) : null}
          </div>
          {state.fieldErrors.orderUrl ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.orderUrl}</p>
          ) : null}
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-black">Title</span>
          <input
            ref={titleInputRef}
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
            ref={descriptionInputRef}
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
          <span className="mb-1 block text-sm font-medium text-black">Priority</span>
          <PriorityStarsInput name="priority" defaultValue={priorityDefaultValue} />
          {state.fieldErrors.priority ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.priority}</p>
          ) : null}
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-black">ETA Days</span>
          <input
            name="etaDays"
            type="number"
            min={0}
            max={365}
            defaultValue={valueFor("etaDays")}
            className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          {state.fieldErrors.etaDays ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.etaDays}</p>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-black">Vendor</span>
          <input
            ref={vendorInputRef}
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
            ref={categorySelectRef}
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
