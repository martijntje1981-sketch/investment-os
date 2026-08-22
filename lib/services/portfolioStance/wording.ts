/**
 * Educational copy + advisory-language guards for Portfolio Stance.
 */

export const STANCE_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\byou should\b/i,
  /\bshould change\b/i,
  /\brecommended allocation\b/i,
  /\boptimal portfolio\b/i,
  /\bideal stance\b/i,
  /\btake more risk\b/i,
  /\bguaranteed\b/i,
  /\bdangerous\b/i,
  /\bunsafe\b/i,
  /\bsafe\b/i,
  /\bbad portfolio\b/i,
  /\bgood portfolio\b/i,
  /\ban offensive investor\b/i,
];

export function assertNoStanceAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of STANCE_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Portfolio Stance advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
