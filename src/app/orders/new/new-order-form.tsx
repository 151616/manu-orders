"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createOrder } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsInput } from "@/components/priority-stars-input";
import { SubmitButton } from "@/components/submit-button";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";
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

type VendorCaptureItem = {
  title?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
};

type VendorCapturePayload = {
  id: string;
  source: string;
  vendorDomain: string;
  pageUrl: string;
  capturedAt: string;
  selectedItems?: VendorCaptureItem[] | null;
  createdAt: string;
};

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const PRODUCT_PREVIEW_TIMEOUT_MS = 15000;
const CAPTURE_LOOKUP_TIMEOUT_MS = 10000;
const CREATE_ORDER_DEBUG_TIMEOUT_MS = 12000;

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

function logAutofillDebug(event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (details) {
    console.warn(`[ManuQueue Autofill Debug] ${timestamp} ${event}`, details);
    return;
  }
  console.warn(`[ManuQueue Autofill Debug] ${timestamp} ${event}`);
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

export function NewOrderForm({ defaults }: NewOrderFormProps) {
  const [state, formAction] = useActionState(createOrder, EMPTY_FORM_STATE);
  const [autofillStatus, setAutofillStatus] = useState<
    "idle" | "loading" | "ready" | "applied" | "error"
  >("idle");
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillSuggestion, setAutofillSuggestion] =
    useState<ProductAutofillResponse | null>(null);
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [captureMessage, setCaptureMessage] = useState("");
  const [latestCapture, setLatestCapture] = useState<VendorCapturePayload | null>(
    null,
  );

  const extractRequestIdRef = useRef(0);
  const extractAbortRef = useRef<AbortController | null>(null);
  const captureRequestIdRef = useRef(0);
  const initialBookmarkAutofillAttemptedRef = useRef(false);
  const createOrderDebugRequestIdRef = useRef(0);
  const createOrderPendingRef = useRef<{
    requestId: string;
    startedAt: number;
  } | null>(null);

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

  const loadLatestCapture = useCallback(async () => {
    const requestOrdinal = captureRequestIdRef.current + 1;
    captureRequestIdRef.current = requestOrdinal;
    const requestId = `capture-${Date.now()}-${requestOrdinal}`;

    setCaptureStatus("loading");
    setCaptureMessage("Checking extension captures...");
    logAutofillDebug("capture-request-start", {
      requestId,
      path: window.location.pathname,
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort("capture-timeout");
    }, CAPTURE_LOOKUP_TIMEOUT_MS);

    try {
      const response = await fetch("/api/vendor/capture", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; capture?: VendorCapturePayload | null }
        | null;
      logAutofillDebug("capture-request-response", {
        requestId,
        status: response.status,
        ok: response.ok,
      });

      if (captureRequestIdRef.current !== requestOrdinal) {
        logAutofillDebug("capture-request-stale", { requestId });
        return;
      }

      if (!response.ok) {
        const errorMessage =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Could not load extension capture.";
        setCaptureStatus("error");
        setCaptureMessage(errorMessage);
        setLatestCapture(null);
        logAutofillDebug("capture-request-error", {
          requestId,
          error: errorMessage,
        });
        return;
      }

      const capture =
        body &&
        typeof body === "object" &&
        "capture" in body &&
        body.capture &&
        typeof body.capture === "object"
          ? (body.capture as VendorCapturePayload)
          : null;

      setLatestCapture(capture);
      setCaptureStatus("ready");
      setCaptureMessage(
        capture
          ? "Latest extension capture is ready."
          : "No extension capture found yet.",
      );
      logAutofillDebug("capture-request-ready", {
        requestId,
        hasCapture: Boolean(capture),
        captureId: capture?.id ?? null,
      });
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      const message = isAbortError
        ? "Capture lookup timed out. Try Refresh."
        : "Could not load extension capture.";
      setCaptureStatus("error");
      setCaptureMessage(message);
      setLatestCapture(null);
      logAutofillDebug("capture-request-failed", {
        requestId,
        aborted: isAbortError,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    logAutofillDebug("ready", {
      hint:
        "If autofill hangs, copy logs starting with [ManuQueue Autofill Debug] and share them.",
    });
  }, []);

  useEffect(() => {
    const pending = createOrderPendingRef.current;
    if (!pending) {
      return;
    }

    const elapsedMs = Math.round(performance.now() - pending.startedAt);
    logAutofillDebug("create-order-response", {
      requestId: pending.requestId,
      elapsedMs,
      success: state.success,
      error: state.error,
      fieldErrorCount: Object.keys(state.fieldErrors).length,
    });
    createOrderPendingRef.current = null;
  }, [state.error, state.fieldErrors, state.success]);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    console.error("[ManuQueue Create Order Debug] submit-failed", {
      error: state.error,
      fieldErrors: state.fieldErrors,
      submittedFields: Object.keys(state.submittedValues),
      online: navigator.onLine,
    });
  }, [state.error, state.fieldErrors, state.submittedValues]);

  useEffect(() => {
    return () => {
      if (extractAbortRef.current) {
        extractAbortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadLatestCapture();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadLatestCapture]);

  const fetchProductAutofill = useCallback(
    async (
      rawUrl: string,
      trigger: "manual-input" | "bookmark-default" | "extension-capture" = "manual-input",
    ) => {
    const normalized = normalizeUrlInput(rawUrl);
    if (!normalized) {
      setAutofillStatus("idle");
      setAutofillMessage("");
      setAutofillSuggestion(null);
      logAutofillDebug("preview-skipped-empty-url", { trigger });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalized);
    } catch {
      setAutofillStatus("error");
      setAutofillMessage("Enter a valid URL to fetch product details.");
      setAutofillSuggestion(null);
      logAutofillDebug("preview-invalid-url", {
        trigger,
        url: normalized,
      });
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setAutofillStatus("error");
      setAutofillMessage("Only HTTP(S) URLs are supported.");
      setAutofillSuggestion(null);
      logAutofillDebug("preview-unsupported-url-scheme", {
        trigger,
        protocol: parsedUrl.protocol,
      });
      return;
    }

    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
    }

    const abortController = new AbortController();
    extractAbortRef.current = abortController;

    const requestOrdinal = extractRequestIdRef.current + 1;
    extractRequestIdRef.current = requestOrdinal;
    const requestId = `preview-${Date.now()}-${requestOrdinal}`;

    setAutofillStatus("loading");
    setAutofillMessage("Extracting product metadata...");
    setAutofillSuggestion(null);
    logAutofillDebug("preview-request-start", {
      requestId,
      trigger,
      url: normalized,
    });

    const timeoutId = window.setTimeout(() => {
      abortController.abort("preview-timeout");
    }, PRODUCT_PREVIEW_TIMEOUT_MS);

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
      logAutofillDebug("preview-request-response", {
        requestId,
        status: response.status,
        ok: response.ok,
      });

      if (extractRequestIdRef.current !== requestOrdinal) {
        logAutofillDebug("preview-request-stale", { requestId });
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
        logAutofillDebug("preview-request-error", {
          requestId,
          error: errorMessage,
        });
        return;
      }

      if (!body || typeof body !== "object" || !("title" in body)) {
        setAutofillStatus("error");
        setAutofillMessage("No usable product metadata was found.");
        setAutofillSuggestion(null);
        logAutofillDebug("preview-request-empty-result", { requestId });
        return;
      }

      const parsed = body as ProductAutofillResponse;
      if (orderUrlInputRef.current) {
        orderUrlInputRef.current.value = parsed.normalizedUrl;
      }
      setAutofillStatus("ready");
      setAutofillMessage("Press Tab to autofill.");
      setAutofillSuggestion(parsed);
      logAutofillDebug("preview-request-ready", {
        requestId,
        source: parsed.source,
        confidence: parsed.confidence,
      });
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      if (isAbortError && extractRequestIdRef.current !== requestOrdinal) {
        logAutofillDebug("preview-request-cancelled-by-newer-request", {
          requestId,
        });
        return;
      }

      setAutofillStatus("error");
      setAutofillMessage(
        isAbortError
          ? "Autofill request timed out. Try again or use a direct product URL."
          : "Failed to fetch product information.",
      );
      setAutofillSuggestion(null);
      logAutofillDebug("preview-request-failed", {
        requestId,
        aborted: isAbortError,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      window.clearTimeout(timeoutId);
      if (extractAbortRef.current === abortController) {
        extractAbortRef.current = null;
      }
    }
    },
    [],
  );

  useEffect(() => {
    if (initialBookmarkAutofillAttemptedRef.current) {
      return;
    }

    const initialUrl = normalizeUrlInput(
      state.submittedValues.orderUrl ?? defaults.orderUrl,
    );
    if (!initialUrl) {
      return;
    }

    initialBookmarkAutofillAttemptedRef.current = true;
    logAutofillDebug("bookmark-url-autofill-start", {
      url: initialUrl,
    });
    void fetchProductAutofill(initialUrl, "bookmark-default");
  }, [defaults.orderUrl, fetchProductAutofill, state.submittedValues.orderUrl]);

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
    logAutofillDebug("preview-applied-to-form", {
      source: autofillSuggestion.source,
      confidence: autofillSuggestion.confidence,
    });
  }, [autofillSuggestion]);

  const applyExtensionCapture = useCallback(() => {
    if (!latestCapture) {
      return;
    }

    const captureUrl = normalizeUrlInput(latestCapture.pageUrl);
    if (!captureUrl) {
      setCaptureStatus("error");
      setCaptureMessage("Capture URL is invalid.");
      return;
    }

    if (orderUrlInputRef.current) {
      orderUrlInputRef.current.value = captureUrl;
    }

    const capturedTitle = latestCapture.selectedItems?.[0]?.title ?? "";
    if (capturedTitle && titleInputRef.current) {
      titleInputRef.current.value = capturedTitle;
    }
    if (vendorInputRef.current && !vendorInputRef.current.value.trim()) {
      vendorInputRef.current.value = latestCapture.vendorDomain;
    }

    logAutofillDebug("capture-applied-to-url", {
      captureId: latestCapture.id,
      url: captureUrl,
    });
    void fetchProductAutofill(captureUrl, "extension-capture");
  }, [fetchProductAutofill, latestCapture]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const requestOrdinal = createOrderDebugRequestIdRef.current + 1;
        createOrderDebugRequestIdRef.current = requestOrdinal;
        const requestId = `create-${Date.now()}-${requestOrdinal}`;
        createOrderPendingRef.current = {
          requestId,
          startedAt: performance.now(),
        };

        const formData = new FormData(event.currentTarget);
        const titleValue = formData.get("title");
        const orderUrlValue = formData.get("orderUrl");
        logAutofillDebug("create-order-submit", {
          requestId,
          titleLength: typeof titleValue === "string" ? titleValue.trim().length : 0,
          orderUrl: normalizeUrlInput(
            typeof orderUrlValue === "string" ? orderUrlValue : "",
          ),
          autofillStatus,
          hasAutofillSuggestion: Boolean(autofillSuggestion),
          online: navigator.onLine,
        });

        window.setTimeout(() => {
          const pending = createOrderPendingRef.current;
          if (!pending || pending.requestId !== requestId) {
            return;
          }

          logAutofillDebug("create-order-still-pending", {
            requestId,
            elapsedMs: Math.round(performance.now() - pending.startedAt),
            online: navigator.onLine,
          });
        }, CREATE_ORDER_DEBUG_TIMEOUT_MS);
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black">Create New Order</h1>
        <p className="text-sm text-black/65">
          Bookmarks and direct URLs are supported. Vendor Browser was removed.
        </p>
      </div>

      <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-black">Extension Capture (optional)</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void loadLatestCapture();
              }}
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-black/80 hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={applyExtensionCapture}
              disabled={!latestCapture}
              className="rounded-md border border-black bg-black px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use Latest Capture
            </button>
          </div>
        </div>
        {captureStatus === "loading" ? (
          <p className="mt-2 text-xs text-black/65">Checking extension captures...</p>
        ) : null}
        {captureStatus === "error" ? (
          <p className="mt-2 text-xs text-red-600">{captureMessage}</p>
        ) : null}
        {latestCapture ? (
          <div className="mt-2 space-y-1 text-xs text-black/75">
            <p className="break-all">
              Latest URL: <span className="font-semibold">{latestCapture.pageUrl}</span>
            </p>
            <p>
              Captured: {new Date(latestCapture.capturedAt).toLocaleString()} from{" "}
              {latestCapture.vendorDomain}
            </p>
          </div>
        ) : captureStatus === "ready" ? (
          <p className="mt-2 text-xs text-black/65">{captureMessage}</p>
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
              onPaste={(event) => {
                const input = event.currentTarget;
                window.setTimeout(() => {
                  void fetchProductAutofill(input.value, "manual-input");
                }, 0);
              }}
              onBlur={(event) => {
                void fetchProductAutofill(event.currentTarget.value, "manual-input");
              }}
              onChange={() => {
                if (autofillStatus !== "idle") {
                  clearAutofillResult();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Tab" && autofillStatus === "ready") {
                  event.preventDefault();
                  applyAutofill();
                }
              }}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 pr-36 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            {autofillStatus === "loading" ? (
              <span
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-300 border-t-black"
                aria-hidden="true"
              />
            ) : null}
            {autofillStatus === "ready" ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/35">
                Press Tab to autofill
              </span>
            ) : null}
          </div>
          {state.fieldErrors.orderUrl ? (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.orderUrl}</p>
          ) : null}
          {autofillStatus === "error" ? (
            <p className="mt-1 text-xs text-red-600">{autofillMessage}</p>
          ) : null}
          {autofillStatus === "applied" ? (
            <p className="mt-1 text-xs text-green-700">{autofillMessage}</p>
          ) : null}
          {autofillSuggestion ? (
            <p className="mt-1 text-xs text-black/65">
              Source: {extractionSourceLabel(autofillSuggestion.source)} (
              {extractionConfidenceLabel(autofillSuggestion.confidence)})
            </p>
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
