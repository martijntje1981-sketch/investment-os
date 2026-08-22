/**
 * Pure multi-portfolio access rules.
 * Extra portfolios created during Complete remain stored after a Free downgrade.
 */

import { canCreateAnotherPortfolio } from "@/lib/services/productAccess/portfolioEntitlement";

export type PortfolioRecord = {
  id: string;
  name: string;
  isPrimary: boolean;
  createdAt: string;
};

export type AccessiblePortfolio = PortfolioRecord & {
  accessible: boolean;
  locked: boolean;
};

export function annotatePortfolioAccess(
  portfolios: PortfolioRecord[],
  maxPortfolios: number,
): AccessiblePortfolio[] {
  const primary =
    portfolios.find((portfolio) => portfolio.isPrimary) ?? portfolios[0] ?? null;
  const withinLimit = portfolios.length <= maxPortfolios;

  return portfolios.map((portfolio) => {
    const accessible = withinLimit || portfolio.id === primary?.id;
    return {
      ...portfolio,
      accessible,
      locked: !accessible,
    };
  });
}

export function resolveActivePortfolioId(
  portfolios: AccessiblePortfolio[],
  storedId: string | null | undefined,
): string | null {
  const accessible = portfolios.filter((portfolio) => portfolio.accessible);
  if (storedId) {
    const match = accessible.find((portfolio) => portfolio.id === storedId);
    if (match) return match.id;
  }
  const primary = accessible.find((portfolio) => portfolio.isPrimary);
  return primary?.id ?? accessible[0]?.id ?? null;
}

export function isPortfolioAccessible(
  portfolios: AccessiblePortfolio[],
  portfolioId: string,
): boolean {
  return portfolios.some(
    (portfolio) => portfolio.id === portfolioId && portfolio.accessible,
  );
}

export { canCreateAnotherPortfolio };
