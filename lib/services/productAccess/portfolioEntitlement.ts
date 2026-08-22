/**
 * Central portfolio-count entitlement.
 * Do not scatter Free=1 / Complete=3 checks across UI or API routes.
 */

export const FREE_MAX_PORTFOLIOS = 1;
export const COMPLETE_MAX_PORTFOLIOS = 3;

export function maxPortfoliosForTier(tier: string): number {
  if (tier === "complete" || tier === "trial") {
    return COMPLETE_MAX_PORTFOLIOS;
  }
  return FREE_MAX_PORTFOLIOS;
}

export function maxPortfoliosForAccess(access: { tier: string }): number {
  return maxPortfoliosForTier(access.tier);
}

export function canCreateAnotherPortfolio(
  portfolioCount: number,
  maxPortfolios: number,
): boolean {
  return portfolioCount < maxPortfolios;
}
