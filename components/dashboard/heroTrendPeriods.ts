/**
 * Hero sparkline period options. Keep period semantics honest:
 * only expose periods with genuine portfolio history series.
 */
export type HeroTrendPeriodId = "1W" | "1M";

export const HERO_TREND_PERIOD_ORDER: HeroTrendPeriodId[] = ["1W", "1M"];

export const HERO_TREND_DEFAULT_PERIOD: HeroTrendPeriodId = "1M";
