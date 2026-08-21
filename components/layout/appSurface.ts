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
  "min-w-0 overflow-hidden rounded-[24px] border-2 border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-white shadow-[0_12px_32px_-16px_rgba(8,145,178,0.38)] md:rounded-[28px]";

/**
 * Primary Tobailey intelligence accent — Q1 cyan/light-blue family.
 * Use on major Dashboard intelligence outside Four Questions.
 * White/off-white content with a cyan border; not a full color block.
 */
export const appIntelligenceAccentCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-cyan-200/80 bg-white shadow-[var(--shadow-card)] md:rounded-[28px]";

/** Slightly stronger cyan wash for signature intelligence (Portfolio Evolution). */
export const appIntelligenceAccentStrongCardClass =
  "min-w-0 overflow-hidden rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white shadow-[0_12px_32px_-18px_rgba(8,145,178,0.22)] md:rounded-[28px]";

export const appIntelligenceAccentMetricClass =
  "min-w-0 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3";

export const appIntelligenceAccentEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-800";

export const appIntelligenceAccentIconWellClass =
  "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100";

/** Soft section band behind stacked supporting content. */
export const appSectionBandClass =
  "rounded-[28px] border border-brand/12 bg-brand-soft/45 p-4 md:p-5";

/* ── Dark navy hierarchy ─────────────────────────────────── */

/**
 * Shared page hero — dark Q1 / Tobailey cyan (cyan-950 → cyan-800).
 * Same family as appIntelligenceAccent*; dark enough for white type.
 * CTA black (`bg-navy-hero`) stays on buttons / non-hero panels.
 */
export const appHeroShellClass =
  "min-w-0 overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-hero-premium-from via-hero-premium-via to-hero-premium-to text-white shadow-[var(--hero-premium-shadow)] md:rounded-[32px]";

/** Dashboard portfolio hero uses the same Q1 cyan shell. */
export const appDashboardHeroShellClass = appHeroShellClass;

export const appDashboardHeroInsetClass =
  "rounded-xl border border-white/15 bg-white/10";

export const appDashboardHeroMetricLabelClass =
  "text-[13px] font-semibold uppercase tracking-[0.06em] text-white/90";

export const appDashboardHeroMetaClass =
  "text-[15px] font-medium leading-relaxed text-white/90";

/** Important dark card — slightly lifted near-black. */
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
  "max-w-full break-words text-[2.25rem] font-bold leading-none tracking-[-0.045em] tabular-nums sm:text-[2.75rem] md:text-[3.25rem]";

/** Matched KPI size for secondary hero metrics (move). */
export const appHeroMatchedKpiClass =
  "max-w-full break-words text-[1.375rem] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[1.625rem] md:text-[1.875rem]";

/** Secondary hero KPI — card-value scale. */
export const appHeroKpiClass =
  "text-lg font-bold leading-none tracking-[-0.02em] tabular-nums";

/** Quiet eyebrow labels on dark surfaces — readable uppercase, not micro-copy. */
export const appHeroMetricLabelClass =
  "text-[13px] font-semibold uppercase tracking-[0.06em] text-white/90";

/* ── Buttons ─────────────────────────────────────────────── */

/** Shared disabled treatment — faded, not active/on. */
export const appControlDisabledClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const appPrimaryButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[16px] font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${appControlDisabledClass}`;

/** Solid navy CTA for primary form actions on light surfaces. */
export const appSolidButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-navy-hero px-5 py-3 text-[16px] font-bold text-white transition hover:bg-navy-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${appControlDisabledClass}`;

export const appBrandSoftButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-5 py-3 text-[16px] font-bold text-brand-navy transition hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${appControlDisabledClass}`;

/** Visible secondary action on light surfaces — never as faint as body copy. */
export const appSecondaryButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-[16px] font-semibold text-slate-950 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${appControlDisabledClass}`;

export const appGhostButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-[16px] font-semibold text-slate-800 transition hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${appControlDisabledClass}`;

/** Secondary CTA on navy/near-black heroes — readable white, not brand-dominant. */
export const appHeroSecondaryButtonClass =
  `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/15 px-4 py-2.5 text-[16px] font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appControlDisabledClass}`;

/** Primary CTA on premium-blue heroes — solid light button, navy label. */
export const appHeroPrimaryButtonClass =
  `inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[16px] font-bold text-brand-navy shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero ${appControlDisabledClass}`;

/** Ghost CTA on navy/near-black heroes. */
export const appHeroGhostButtonClass = appHeroSecondaryButtonClass;

export const appTextLinkClass =
  "inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-semibold text-brand-navy underline-offset-2 transition hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/* ── Titles ──────────────────────────────────────────────── */

export const appPageTitleClass =
  "text-[1.375rem] font-bold tracking-[-0.02em] text-slate-950 sm:text-[1.625rem]";

export const appPageHeroTitleClass =
  "break-words text-[1.625rem] font-bold tracking-[-0.03em] sm:text-[1.75rem] md:text-[1.75rem]";

export const appPageHeroSubtitleClass =
  "mt-1.5 max-w-2xl break-words text-[16px] font-medium leading-relaxed tracking-[-0.01em] text-white/90";

export const appSectionTitleClass =
  "text-[1.25rem] font-bold tracking-[-0.02em] text-slate-950 md:text-[1.5rem]";

export const appCardTitleClass =
  "text-[1.125rem] font-bold tracking-[-0.015em] text-slate-950";

/* ── Body / labels ───────────────────────────────────────── */

export const appSectionBodyMediumClass =
  "text-[16px] font-medium leading-relaxed";

export const appCardValueClass =
  "text-xl font-bold tabular-nums tracking-[-0.02em] text-slate-950";

export const appSectionBodyClass =
  "text-[16px] font-normal leading-relaxed text-slate-800";

export const appSectionSubtitleClass =
  "text-[15px] font-normal leading-relaxed text-slate-700 sm:text-[16px]";

/** Compact uppercase label — 13px floor so metadata stays readable. */
export const appSectionLabelClass =
  "text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700";

export const appSectionMetaClass =
  "text-[13px] font-medium leading-relaxed text-slate-700";

export const appTickerClass =
  "text-[13px] font-medium uppercase tracking-[0.06em] text-slate-700";

export const appTableNameClass = "min-w-0 break-words text-[16px] font-semibold text-slate-950";

export const appTableValueClass =
  "text-[16px] font-semibold tabular-nums text-slate-950";

export const appTableChangeClass = "text-[16px] font-semibold tabular-nums";

/** @deprecated Prefer appSectionLabelClass */
export const appSectionEyebrowClass = appSectionLabelClass;

export const appSectionHeaderPaddingClass = "px-4 py-4 md:px-6 md:py-5";

export const appSectionHeaderDividerClass = "border-b border-slate-100";

/* ── Dark body copy ──────────────────────────────────────── */

export const appDashboardDarkBodyClass =
  "text-[16px] font-normal leading-relaxed text-white";

export const appDashboardDarkBodyMediumClass =
  "text-[16px] font-medium leading-relaxed text-white/90";

export const appDashboardDarkMutedClass =
  "text-[15px] font-medium leading-relaxed text-white/85";

export const appDashboardDarkMetaClass =
  "text-[13px] font-medium leading-relaxed text-white/90";

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
  "text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-navy";

export const appNewsSectionTitleClass = appSectionTitleClass;

export const appNewsSectionDescriptionClass = appSectionSubtitleClass;

/** Four Questions label (the question). */
export const appFourQuestionLabelClass =
  "block text-[14px] font-semibold tracking-[-0.01em] text-slate-700 sm:text-[15px]";

/** Four Questions primary answer — glanceable intelligence, 18–22px. */
export const appFourQuestionAnswerClass =
  "mt-1.5 block break-words text-[1.125rem] font-bold leading-snug tracking-[-0.03em] sm:text-[1.375rem]";

export const appFourQuestionSupportClass =
  "mt-1.5 block break-words text-[16px] leading-relaxed text-slate-700";

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
