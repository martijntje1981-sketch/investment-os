/**
 * Shared authenticated-app surface, typography, and spacing tokens.
 * Prefer these over page-specific magic values.
 */

/** Vertical rhythm between major page sections. */
export const appPageSectionClass = "space-y-8 md:space-y-10";

/** Default page canvas (PageContainer). Soft cool tint — not flat white. */
export const appPageCanvasClass =
  "min-h-screen w-full max-w-full overflow-x-clip bg-background px-4 pb-28 pt-[4.5rem] text-foreground sm:px-6 sm:pb-28 sm:pt-[5rem] [[data-example-banner=true]_&]:pt-[6.25rem] sm:[[data-example-banner=true]_&]:pt-[6.75rem]";

/** Inner content column. */
export const appPageStackClass =
  "mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 md:gap-8";

/* ── Light cards ─────────────────────────────────────────── */

export const appCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-card shadow-[var(--shadow-card)] md:rounded-[28px]";

export const appCardPaddingClass = "px-4 py-5 md:px-6 md:py-6";

export const appCardPaddingCompactClass = "px-4 py-4 md:px-5 md:py-5";

/** Interactive light card hover. */
export const appCardInteractiveClass =
  "transition duration-200 hover:border-brand/25 hover:shadow-[0_2px_8px_rgba(15,40,70,0.06),0_14px_34px_-14px_rgba(15,45,80,0.16)]";

/**
 * Quiet blue-tinted panel for discoverability / first-run sections.
 * Use sparingly — not on every card.
 */
export const appTintedPanelClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-brand/20 bg-gradient-to-br from-brand-soft via-white to-[#f3f7fb] shadow-[var(--shadow-card)] md:rounded-[28px]";

/** Soft section band behind stacked supporting content. */
export const appSectionBandClass =
  "rounded-[28px] border border-brand/12 bg-brand-soft/45 p-4 md:p-5";

/* ── Dark navy hierarchy ─────────────────────────────────── */

/** Primary hero — midnight navy with a quiet blue tonal lift. */
export const appHeroShellClass =
  "min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,var(--navy-hero-lift)_0%,var(--navy-hero)_52%,var(--navy-hero-deep)_100%)] text-white shadow-[var(--navy-shadow)] md:rounded-[32px]";

/** Important dark card — slightly lighter navy. */
export const appDarkCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-navy-card text-white shadow-[var(--navy-shadow)] md:rounded-[28px]";

/** Subtle inset surface inside dark cards. */
export const appDarkInsetClass =
  "rounded-xl border border-white/10 bg-white/[0.07]";

/** Compact padding for dense dark heroes (dashboard + peers). */
export const appHeroPaddingCompactClass =
  "px-4 py-3 sm:px-5 sm:py-3.5 md:px-5 md:py-3.5";

/** Standard padding for dark cards. */
export const appDarkCardPaddingClass = "px-4 py-5 md:px-6 md:py-6";

/* ── Hero / metric type ──────────────────────────────────── */

/** Dominant hero portfolio value. */
export const appDisplayClass =
  "max-w-full break-words text-[2rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.5rem] md:text-[2.75rem]";

/** Matched KPI size for secondary hero metrics (move). */
export const appHeroMatchedKpiClass =
  "max-w-full break-words text-[1.375rem] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[1.625rem] md:text-[1.875rem]";

/** Secondary hero KPI — card-value scale. */
export const appHeroKpiClass =
  "text-lg font-bold leading-none tracking-[-0.02em] tabular-nums";

/** Quiet eyebrow labels on dark surfaces — small uppercase only. */
export const appHeroMetricLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55";

/* ── Buttons ─────────────────────────────────────────────── */

export const appPrimaryButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/** Solid navy CTA for primary form actions on light surfaces. */
export const appSolidButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-navy-hero px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const appBrandSoftButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export const appGhostButtonClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export const appTextLinkClass =
  "inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-brand-navy transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/* ── Titles ──────────────────────────────────────────────── */

export const appPageTitleClass =
  "text-xl font-bold tracking-[-0.02em] text-slate-950";

export const appPageHeroTitleClass =
  "break-words text-[1.625rem] font-bold tracking-[-0.03em] sm:text-[1.75rem] md:text-[1.875rem]";

export const appPageHeroSubtitleClass =
  "mt-1.5 max-w-2xl break-words text-[14px] font-medium leading-relaxed tracking-[-0.01em] text-white/70 sm:text-[15px]";

export const appSectionTitleClass =
  "text-lg font-bold tracking-[-0.02em] text-slate-950 md:text-xl";

export const appCardTitleClass =
  "text-base font-bold tracking-[-0.015em] text-slate-950";

/* ── Body / labels ───────────────────────────────────────── */

export const appSectionBodyMediumClass =
  "text-[15px] font-medium leading-relaxed";

export const appCardValueClass =
  "text-lg font-bold tabular-nums text-slate-950";

export const appSectionBodyClass =
  "text-[15px] font-normal leading-relaxed text-slate-700";

export const appSectionSubtitleClass =
  "text-[14px] font-normal leading-relaxed text-slate-500";

/** Small contextual eyebrow — use sparingly. */
export const appSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export const appSectionMetaClass =
  "text-[12px] font-medium leading-snug text-slate-500";

export const appTickerClass =
  "text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500";

export const appTableNameClass = "text-[15px] font-semibold text-slate-950";

export const appTableValueClass =
  "text-[15px] font-semibold tabular-nums text-slate-950";

export const appTableChangeClass = "text-[15px] font-semibold tabular-nums";

/** @deprecated Prefer appSectionLabelClass */
export const appSectionEyebrowClass = appSectionLabelClass;

export const appSectionHeaderPaddingClass = "px-4 py-4 md:px-6 md:py-5";

export const appSectionHeaderDividerClass = "border-b border-slate-100";

/* ── Dark body copy ──────────────────────────────────────── */

export const appDashboardDarkBodyClass =
  "text-[15px] font-normal leading-relaxed text-white";

export const appDashboardDarkBodyMediumClass =
  "text-[15px] font-medium leading-relaxed text-white/85";

export const appDashboardDarkMutedClass =
  "text-[13px] font-medium leading-snug text-white/65";

export const appDashboardDarkMetaClass =
  "text-[12px] font-medium leading-snug text-white/55";

export const appAnalysisDarkTitleClass =
  "text-xl font-bold tracking-[-0.02em] text-white";

export const appAnalysisDarkHeaderCopyClass = appDashboardDarkMutedClass;

export const appAnalysisDarkBodyClass = appDashboardDarkBodyMediumClass;

export const appAnalysisDarkDisclaimerClass = appDashboardDarkMetaClass;

/** @deprecated Use appCardValueClass */
export const appValueClass = appCardValueClass;

/** @deprecated Use appTableValueClass */
export const appValueSemiboldClass = appTableValueClass;

/** @deprecated Use appTableChangeClass */
export const appChangeClass = appTableChangeClass;

export const appTableCellPaddingClass = "py-4";

export const appBottomNavLabelClass = "text-[13px] font-medium";

export const appBottomNavFeaturedLabelClass = "text-[13px] font-semibold";

export const appNewsEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-navy";

export const appNewsSectionTitleClass = appSectionTitleClass;

export const appNewsSectionDescriptionClass = appSectionSubtitleClass;

/**
 * Secondary dark feature shell — aligned to navy hierarchy
 * (replaces prior purple gradient for consistency).
 */
export const appDashboardFeatureShellClass = appDarkCardClass;

export const appDashboardLightCardClass = appCardClass;

/** @deprecated Use appTableValueClass */
export const appDashboardHoldingsValueClass = appTableValueClass;

/** @deprecated Use appTableChangeClass */
export const appDashboardHoldingsChangeClass = appTableChangeClass;
