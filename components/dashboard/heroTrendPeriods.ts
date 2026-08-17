/**
 * Hero sparkline period options. Keep period semantics honest:
 * genuine intraday (1D) history is not available via the portfolio history API.
 */
export type HeroTrendPeriodId = "1D" | "1W" | "1M";

export const HERO_TREND_PERIOD_ORDER: HeroTrendPeriodId[] = ["1D", "1W", "1M"];

/** Set true only when a verified intraday portfolio series exists. */
export const HERO_INTRADAY_HISTORY_AVAILABLE = false;
