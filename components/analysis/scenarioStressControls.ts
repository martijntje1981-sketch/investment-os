/**
 * Shared selectable-control styles for Analysis Scenario / Goal Sensitivity.
 * Keeps interactive affordance consistent without coupling to React components.
 */

/** Primary scenario chooser — strong selected vs clearly interactive idle. */
export function scenarioChoiceClass(selected: boolean): string {
  const base =
    "min-h-11 cursor-pointer rounded-2xl px-4 py-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:scale-[0.99]";
  if (selected) {
    return `${base} border-2 border-sky-600 bg-sky-50 text-sky-950 shadow-sm ring-1 ring-sky-600/20`;
  }
  return `${base} border border-slate-300 bg-white text-slate-900 hover:border-sky-500 hover:bg-sky-50/60 hover:shadow-sm`;
}

/** Secondary personal-input chips (contribution / target year). */
export function personalChoiceClass(selected: boolean): string {
  const base =
    "min-h-11 cursor-pointer rounded-xl px-3 py-2 text-[15px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:scale-[0.99]";
  if (selected) {
    return `${base} border-2 border-sky-600 bg-sky-50 text-sky-950 shadow-sm`;
  }
  return `${base} border border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50/50`;
}

export const detailsToggleClass =
  "inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl px-1 py-2 text-[15px] font-semibold text-sky-800 underline-offset-2 transition hover:text-sky-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 marker:content-none [&::-webkit-details-marker]:hidden";
