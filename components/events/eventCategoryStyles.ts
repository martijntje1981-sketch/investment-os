import type { CalendarEventCategory } from "@/lib/services/events/types";
import { CALENDAR_EVENT_CATEGORY_LABELS } from "@/lib/services/events/types";

export function calendarCategoryLabel(
  category: CalendarEventCategory,
): string {
  return CALENDAR_EVENT_CATEGORY_LABELS[category];
}

export function calendarCategoryChipClass(
  category: CalendarEventCategory,
  selected = false,
): string {
  if (selected) {
    return "bg-brand text-brand-navy";
  }
  if (category === "central_banks") {
    return "bg-brand-soft text-brand-navy";
  }
  if (category === "dividends") {
    return "bg-sky-50 text-sky-900";
  }
  if (category === "earnings") {
    return "bg-indigo-50 text-indigo-900";
  }
  if (category === "crypto") {
    return "bg-violet-50 text-violet-900";
  }
  return "bg-slate-100 text-slate-700";
}
