/**
 * Shared selectable-control styles for Analysis Scenario / Goal Sensitivity.
 * Keeps interactive affordance consistent without coupling to React components.
 */

/** Primary scenario chooser — strong selected vs clearly interactive idle. */
export function scenarioChoiceClass(selected: boolean): string {
  const base =
    "min-h-11 cursor-pointer rounded-2xl px-4 py-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.99]";
  if (selected) {
    return `${base} border-2 border-q1-strong bg-q1-soft text-q1-deep shadow-sm ring-1 ring-q1-strong/20`;
  }
  return `${base} border border-slate-300 bg-white text-slate-900 hover:border-brand hover:bg-brand-soft/60 hover:shadow-sm`;
}

/** Secondary personal-input chips (contribution / target year). */
export function personalChoiceClass(selected: boolean): string {
  const base =
    "min-h-11 cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.99]";
  if (selected) {
    return `${base} border-2 border-q1-strong bg-q1-soft text-q1-deep shadow-sm`;
  }
  return `${base} border border-slate-300 bg-white text-slate-700 hover:border-brand hover:bg-brand-soft/50`;
}

export const detailsToggleClass =
  "inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl px-1 py-2 text-sm font-semibold text-q1-strong underline-offset-2 transition hover:text-q1-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand marker:content-none [&::-webkit-details-marker]:hidden";
