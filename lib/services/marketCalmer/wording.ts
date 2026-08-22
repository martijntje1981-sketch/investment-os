/**
 * Advisory-language guards for Market Calmer.
 */

export const MARKET_CALMER_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\bdon'?t panic\b/i,
  /\bdo nothing\b/i,
  /\bstay invested\b/i,
  /\bbuy the dip\b/i,
  /\bwill recover\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
  /\bguaranteed\b/i,
];

export function assertNoAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of MARKET_CALMER_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Market Calmer advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
