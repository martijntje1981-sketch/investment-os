export const newsCompactCardClass =
  "min-w-0 rounded-[20px] border border-slate-200/80 border-l-[3px] border-l-brand/70 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(15,45,80,0.03)] transition hover:border-slate-300 hover:border-l-brand motion-reduce:transition-none min-[480px]:px-4 min-[480px]:py-3.5";

/** Compact category cue — restrained, not rainbow. */
export const newsCategoryBadgeClass =
  "inline-flex min-h-[28px] items-center rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-brand-navy";

export const newsEditorialCardClass =
  "min-w-0 rounded-[20px] border border-slate-200/80 bg-white transition hover:border-slate-300 motion-reduce:transition-none";

/** Stacks media, body and CTA on narrow screens; horizontal from ~480px when space allows. */
export const newsCompactCardLayoutClass =
  "flex min-w-0 flex-col gap-2.5 min-[480px]:flex-row min-[480px]:items-start min-[480px]:gap-3";

export const newsCompactCardMediaClass = "shrink-0";

export const newsCompactCardBodyClass = "min-w-0 flex-1";

export const newsCompactCardActionClass =
  "w-full shrink-0 min-[480px]:w-auto";

export const newsCompactHeadlineClass =
  "break-words text-base font-semibold leading-snug";

export const newsCompactMetaClass =
  "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-[13px] font-medium leading-relaxed text-slate-700";

export const newsExternalLinkClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none min-[480px]:w-auto min-[480px]:justify-start";

export const newsShowMoreButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none sm:w-auto sm:justify-start";
