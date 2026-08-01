/** Shared authenticated-app surface and typography tokens. */
export const appPageSectionClass = "space-y-7 md:space-y-10";

export const appCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:rounded-[28px]";

export const appCardPaddingClass = "px-4 py-5 md:px-6 md:py-6";

export const appCardPaddingCompactClass = "px-4 py-4 md:px-5 md:py-5";

/** Shared solid dark hero surface — Tobailey navy. */
export const appHeroShellClass =
  "min-w-0 overflow-hidden rounded-[28px] border border-brand-navy/90 bg-brand-navy text-white shadow-[0_16px_48px_rgba(11,31,58,0.28)] md:rounded-[32px]";

/** Compact padding for dense dark heroes (dashboard + peers). */
export const appHeroPaddingCompactClass =
  "px-4 py-4 sm:px-6 sm:py-5";

/** Matched KPI value size on dark heroes (portfolio value + move). */
export const appHeroMatchedKpiClass =
  "max-w-full break-words text-[1.625rem] font-bold leading-none tracking-[-0.035em] tabular-nums sm:text-[2rem] md:text-[2.25rem]";

/** Display — main portfolio value and true hero KPIs only. */
export const appDisplayClass =
  "text-[2.25rem] font-black leading-none tracking-[-0.04em] sm:text-[3rem] md:text-[3.375rem]";

/** Primary action button — Tobailey blue with navy text for contrast. */
export const appPrimaryButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/** Soft / secondary brand accent control. */
export const appBrandSoftButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/** Secondary hero KPI (e.g. today's move) — card-value scale, not display. */
export const appHeroKpiClass =
  "text-lg font-bold leading-none tracking-[-0.02em]";

/** Page and section titles — consistent 20px, bold. */
export const appPageTitleClass =
  "text-xl font-bold tracking-[-0.02em]";

/** Large dark hero titles — one step above appPageTitleClass. */
export const appPageHeroTitleClass =
  "break-words text-2xl font-bold tracking-[-0.03em] sm:text-[1.75rem] md:text-3xl";

/** Large dark hero subtitles — one step above the previous 18px hero body. */
export const appPageHeroSubtitleClass =
  "mt-2.5 max-w-2xl break-words text-lg font-medium leading-relaxed tracking-[-0.015em] text-white sm:text-xl";

/** Section titles — consistent 20px, bold. */
export const appSectionTitleClass =
  "text-xl font-bold tracking-[-0.02em] text-slate-950";

/** Emphasized body on dark surfaces — 15px, medium. */
export const appSectionBodyMediumClass =
  "text-[15px] font-medium leading-relaxed";

/** Primary figures inside cards — 18px, bold. */
export const appCardValueClass =
  "text-lg font-bold tabular-nums text-slate-950";

/** Body copy — 15px. */
export const appSectionBodyClass =
  "text-[15px] font-normal leading-relaxed text-slate-800";

/** Section subtitles — 15px, regular. */
export const appSectionSubtitleClass =
  "text-[15px] font-normal leading-relaxed text-slate-600";

/** Uppercase labels — 13px, bold, shared tracking. */
export const appSectionLabelClass =
  "text-[13px] font-bold uppercase tracking-[0.1em] text-slate-600";

/** Metadata, timestamps — 13px, medium. */
export const appSectionMetaClass =
  "text-[13px] font-medium leading-snug text-slate-600";

/** Tickers and secondary identifiers — 13px, medium. */
export const appTickerClass =
  "text-[13px] font-medium uppercase tracking-[0.1em] text-slate-600";

/** Table holding names — 15px, semibold. */
export const appTableNameClass =
  "text-[15px] font-semibold text-slate-950";

/** Table values — 15px, semibold. */
export const appTableValueClass =
  "text-[15px] font-semibold tabular-nums text-slate-950";

/** Table daily changes — 15px, semibold. */
export const appTableChangeClass =
  "text-[15px] font-semibold tabular-nums";

/** @deprecated Prefer appSectionLabelClass */
export const appSectionEyebrowClass = appSectionLabelClass;

export const appSectionHeaderPaddingClass = "px-4 py-5 md:px-6 md:py-5";

export const appSectionHeaderDividerClass = "border-b border-slate-100";

/** Hero metric labels on dark surfaces. */
export const appHeroMetricLabelClass =
  "text-[13px] font-bold uppercase tracking-[0.1em] text-white/75";

/** Primary body on dark dashboard/card surfaces. */
export const appDashboardDarkBodyClass =
  "text-[15px] font-normal leading-relaxed text-white";

/** Emphasized body on dark dashboard/card surfaces. */
export const appDashboardDarkBodyMediumClass =
  "text-[15px] font-medium leading-relaxed text-white/85";

/** Secondary/helper copy on dark dashboard surfaces (~80% white). */
export const appDashboardDarkMutedClass =
  "text-[13px] font-medium leading-snug text-white/80";

/** Tertiary/meta copy on dark dashboard surfaces (~75% white). */
export const appDashboardDarkMetaClass =
  "text-[13px] font-medium leading-snug text-white/75";

/** Section titles on dark analysis / gradient header shells. */
export const appAnalysisDarkTitleClass =
  "text-xl font-bold tracking-[-0.02em] text-white";

/** Supporting copy on dark analysis section headers (gradient shells). */
export const appAnalysisDarkHeaderCopyClass = appDashboardDarkMutedClass;

/** Body copy on dark analysis cards and observation panels. */
export const appAnalysisDarkBodyClass = appDashboardDarkBodyMediumClass;

/** Disclaimer and tertiary copy on dark analysis panels. */
export const appAnalysisDarkDisclaimerClass = appDashboardDarkMetaClass;

/** @deprecated Use appCardValueClass */
export const appValueClass = appCardValueClass;

/** @deprecated Use appTableValueClass */
export const appValueSemiboldClass = appTableValueClass;

/** @deprecated Use appTableChangeClass */
export const appChangeClass = appTableChangeClass;

/** Table row breathing room. */
export const appTableCellPaddingClass = "py-4";

/** Bottom navigation labels — 13px. */
export const appBottomNavLabelClass = "text-[13px] font-medium";

export const appBottomNavFeaturedLabelClass = "text-[13px] font-semibold";

/** News hub — aligned to shared scale. */
export const appNewsEyebrowClass =
  "text-[13px] font-bold uppercase tracking-[0.1em] text-brand-navy";

export const appNewsSectionTitleClass = appSectionTitleClass;

export const appNewsSectionDescriptionClass = appSectionSubtitleClass;

/** Dashboard-only surfaces for dark/light editorial rhythm. */
export const appDashboardFeatureShellClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-[#151038] to-slate-950 text-white shadow-[0_20px_60px_-20px_rgba(67,56,202,0.35)] md:rounded-[28px]";

export const appDashboardLightCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-12px_rgba(15,23,42,0.1)] md:rounded-[28px]";

/** @deprecated Use appTableValueClass */
export const appDashboardHoldingsValueClass = appTableValueClass;

/** @deprecated Use appTableChangeClass */
export const appDashboardHoldingsChangeClass = appTableChangeClass;
