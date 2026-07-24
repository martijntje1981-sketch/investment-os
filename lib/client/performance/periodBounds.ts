import type { PerformancePeriodId } from "@/lib/client/performance/types";

export type PeriodBounds = {
  period: PerformancePeriodId;
  startDate: Date;
  endDate: Date;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Resolve inclusive calendar bounds for a performance period ending on `asOf`. */
export function resolvePeriodBounds(
  period: PerformancePeriodId,
  asOf: Date = new Date(),
): PeriodBounds {
  const endDate = startOfUtcDay(asOf);
  const startDate = new Date(endDate);

  switch (period) {
    case "1D":
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      break;
    case "1W":
      startDate.setUTCDate(startDate.getUTCDate() - 7);
      break;
    case "1M":
      startDate.setUTCMonth(startDate.getUTCMonth() - 1);
      break;
    case "YTD":
      startDate.setUTCMonth(0, 1);
      break;
    case "1Y":
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
      break;
    case "ALL":
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 10);
      break;
    default:
      break;
  }

  return { period, startDate, endDate };
}

export function formatPerformanceAxisDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatPerformanceTooltipDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
