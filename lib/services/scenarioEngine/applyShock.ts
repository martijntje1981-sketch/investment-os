/**
 * Transparent first-order shock math.
 *
 * Example: 40% Bitcoin exposure × −20% shock → −8% portfolio impact.
 */

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ShockApplication = {
  affectedPortfolioWeightPercent: number;
  estimatedPortfolioImpactPercent: number;
  estimatedPortfolioImpactAmount: number;
};

/**
 * impact% = (affectedValue / portfolioTotal) × shockPercent
 * impactAmount = affectedValue × (shockPercent / 100)
 */
export function applyExposureShock(input: {
  portfolioTotalValue: number;
  affectedValue: number;
  shockPercent: number;
}): ShockApplication | null {
  const { portfolioTotalValue, affectedValue, shockPercent } = input;

  if (
    !(portfolioTotalValue > 0) ||
    !Number.isFinite(portfolioTotalValue) ||
    !Number.isFinite(affectedValue) ||
    !Number.isFinite(shockPercent) ||
    affectedValue < 0
  ) {
    return null;
  }

  const weightFraction = affectedValue / portfolioTotalValue;
  const impactFraction = weightFraction * (shockPercent / 100);

  const weightPercent = round1(weightFraction * 100);
  const impactPercent = round1(impactFraction * 100);
  const impactAmount = roundMoney(affectedValue * (shockPercent / 100));

  return {
    affectedPortfolioWeightPercent: Object.is(weightPercent, -0)
      ? 0
      : weightPercent,
    estimatedPortfolioImpactPercent: Object.is(impactPercent, -0)
      ? 0
      : impactPercent,
    estimatedPortfolioImpactAmount: Object.is(impactAmount, -0)
      ? 0
      : impactAmount,
  };
}
