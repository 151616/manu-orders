"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  ROBOTS,
  ROBOT_LABELS,
} from "@/lib/order-domain";
import { CustomSelect } from "@/components/custom-select";

type Props = {
  search: string;
  status: string;
  category: string;
  robot: string;
  isCompact: boolean;
};

function buildQueueHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim().length > 0) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `/queue?${qs}` : "/queue";
}

export function QueueFiltersDropdown({ search, status, category, robot, isCompact }: Props) {
  const hasActiveFilters =
    search.length > 0 || status !== "ALL" || category !== "ALL" || robot !== "ALL";
  const [open, setOpen] = useState(hasActiveFilters);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      >
        <span className="text-sm font-semibold text-black dark:text-white">
          Search & Filters
          {hasActiveFilters ? (
            <span className="ml-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-white/60">
              Active
            </span>
          ) : null}
        </span>
        <span
          className="text-lg font-light leading-none text-black/40 transition-transform duration-200 dark:text-white/40"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form
            className="grid gap-3 border-t border-zinc-200/80 p-4 sm:grid-cols-4 dark:border-white/10"
            action="/queue"
          >
            {isCompact ? <input type="hidden" name="view" value="compact" /> : null}

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Search
              </span>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Title, order number, requester"
                className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
              />
            </label>

            <div>
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Status
              </span>
              <CustomSelect
                name="status"
                defaultValue={status}
                options={[
                  { value: "ALL", label: "All" },
                  ...ORDER_STATUSES.map((item) => ({
                    value: item,
                    label: ORDER_STATUS_LABELS[item],
                  })),
                ]}
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Category
              </span>
              <CustomSelect
                name="category"
                defaultValue={category}
                options={[
                  { value: "ALL", label: "All" },
                  ...ORDER_CATEGORIES.map((item) => ({
                    value: item,
                    label: ORDER_CATEGORY_LABELS[item],
                  })),
                ]}
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                Robot
              </span>
              <CustomSelect
                name="robot"
                defaultValue={robot}
                options={[
                  { value: "ALL", label: "All" },
                  ...ROBOTS.map((r) => ({ value: r, label: ROBOT_LABELS[r] })),
                ]}
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black/85 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                Apply
              </button>
              <Link
                href={buildQueueHref(isCompact ? { view: "compact" } : {})}
                className="w-full rounded-lg border border-black/20 px-4 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
