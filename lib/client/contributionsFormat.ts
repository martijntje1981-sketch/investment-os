export function formatContributionBaseAmount(
  baseAmount: number,
  formatEur: (amountEur: number | null | undefined, decimals?: number) => string,
  convertToEur: (amountBase: number | null | undefined) => number | null,
): string {
  const canonical = convertToEur(baseAmount);
  if (canonical == null) {
    return "Unavailable";
  }

  return formatEur(canonical);
}
