type EtaInput = {
  etaDays: number;
  etaTargetDate: Date | null;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NOON_UTC_MILLISECONDS = 12 * 60 * 60 * 1000;
const DEFAULT_ETA_TIME_ZONE = process.env.ETA_TIME_ZONE?.trim() || "America/New_York";

type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function getCalendarParts(date: Date, timeZone: string): CalendarDateParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("Unable to resolve calendar date for ETA calculation.");
  }

  return { year, month, day };
}

function getCalendarDayIndex(date: Date, timeZone: string) {
  const parts = getCalendarParts(date, timeZone);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MILLISECONDS_PER_DAY);
}

export function addDays(base: Date, days: number): Date {
  const dayCount = Number.isFinite(days) ? Math.trunc(days) : 0;
  const baseDayIndex = getCalendarDayIndex(base, DEFAULT_ETA_TIME_ZONE);
  const targetDayIndex = baseDayIndex + dayCount;

  // Store target dates at noon UTC to avoid DST boundary edge-cases.
  return new Date(targetDayIndex * MILLISECONDS_PER_DAY + NOON_UTC_MILLISECONDS);
}

export function getEtaDeltaDays(order: EtaInput): number {
  if (!order.etaTargetDate) {
    return order.etaDays;
  }

  const todayIndex = getCalendarDayIndex(new Date(), DEFAULT_ETA_TIME_ZONE);
  const targetIndex = getCalendarDayIndex(order.etaTargetDate, DEFAULT_ETA_TIME_ZONE);
  return targetIndex - todayIndex;
}

export function getRemainingEtaDays(order: EtaInput): number {
  return Math.max(0, getEtaDeltaDays(order));
}
