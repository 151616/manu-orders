import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { ToastBanner } from "@/components/toast-banner";
import {
  listOrderRequests,
  listTrackingRequests,
} from "@/app/requests/actions";
import { RequestsClient } from "@/app/requests/requests-client";
import { NewOrderRequestForm } from "@/app/requests/new-order/new-order-request-form";
import { NewTrackingRequestForm } from "@/app/requests/new-tracking/new-tracking-request-form";

type RequestsPageProps = {
  searchParams: Promise<{
    open?: string | string[];
    toast?: string | string[];
    tone?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toastMessage(code: string | undefined) {
  switch (code) {
    case "order-request-approved":
      return "Order request approved and added to queue.";
    case "order-request-rejected":
      return "Order request rejected.";
    case "tracking-request-approved":
      return "Tracking request approved.";
    case "tracking-request-rejected":
      return "Tracking request rejected.";
    default:
      return null;
  }
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const user = await requireAuth();
  const params = await searchParams;

  const openForm = first(params.open);
  const toastCode = first(params.toast);
  const toastTone = first(params.tone) === "debug" ? "debug" : "success";
  const toast = toastMessage(toastCode);
  const isAdmin = user.role === "ADMIN";

  const [orderRequests, trackingRequests] = await Promise.all([
    listOrderRequests(),
    listTrackingRequests(),
  ]);

  return (
    <section className="space-y-5 sm:space-y-6">
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Requests
          </h1>
          <p className="text-sm text-black/65 dark:text-white/65">
            {isAdmin
              ? "Review and manage incoming requests."
              : "Submit requests for parts or manufacturing tasks."}
          </p>
        </div>

        {!isAdmin ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href="/requests?open=order"
              className="flex-1 rounded-lg border border-black bg-black px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black/85 sm:flex-none dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              + Request Part
            </Link>
            <Link
              href="/requests?open=tracking"
              className="flex-1 rounded-lg border border-black/20 px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:flex-none dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              + Request Task
            </Link>
          </div>
        ) : null}
      </header>

      {/* Inline request form for members */}
      {openForm === "order" && !isAdmin ? (
        <div className="rounded-xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-black dark:text-white">
              Request a Part
            </h2>
            <Link
              href="/requests"
              className="text-xs text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Cancel
            </Link>
          </div>
          <NewOrderRequestForm defaultRobot={null} />
        </div>
      ) : null}

      {openForm === "tracking" && !isAdmin ? (
        <NewTrackingRequestForm defaultRobot={null} />
      ) : null}

      {/* Requests list */}
      <RequestsClient
        orderRequests={orderRequests}
        trackingRequests={trackingRequests}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </section>
  );
}
