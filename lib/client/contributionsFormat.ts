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

export function formatContributionEntryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatSignedContributionPercent(
  value: number | null,
  formatPercent: (value: number) => string,
): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const formatted = formatPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}
