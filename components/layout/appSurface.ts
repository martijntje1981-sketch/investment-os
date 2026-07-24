/** Shared authenticated-app surface and typography tokens. */
export const appPageSectionClass = "space-y-7 md:space-y-10";

export const appCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:rounded-[28px]";

export const appCardPaddingClass = "px-4 py-5 md:px-6 md:py-6";

export const appCardPaddingCompactClass = "px-4 py-4 md:px-5 md:py-5";

export const appHeroShellClass =
  "min-w-0 overflow-hidden rounded-[28px] border border-slate-800/75 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.38)] md:rounded-[32px]";

/** Display — main portfolio value and true hero KPIs only. */
export const appDisplayClass =
  "text-[2.25rem] font-black leading-none tracking-[-0.04em] sm:text-[3rem] md:text-[3.375rem]";

/** Secondary hero KPI (e.g. today's move) — card-value scale, not display. */
export const appHeroKpiClass =
  "text-lg font-bold leading-none tracking-[-0.02em]";

/** Page and section titles — consistent 20px, bold. */
export const appPageTitleClass =
  "text-xl font-bold tracking-[-0.02em]";

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
  "text-[13px] font-bold uppercase tracking-[0.1em] text-blue-700";

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
