"use client";

export default function TrackingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      <p className="font-semibold">Failed to load Manu Tracking.</p>
      <p className="mt-1 text-red-700/80">
        {error.message || "An unexpected error occurred."}
        {error.digest ? (
          <span className="ml-2 font-mono text-xs text-red-500">
            ({error.digest})
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}
