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
    return "bg-q1-soft text-q1-deep";
  }
  if (category === "earnings") {
    return "bg-q2-soft text-q2-deep";
  }
  if (category === "crypto") {
    return "bg-q4-soft text-q4-deep";
  }
  return "bg-slate-100 text-slate-700";
}
