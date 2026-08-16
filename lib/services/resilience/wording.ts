/**
 * Educational copy + advisory-language guards for Resilience / Sleep Well.
 */

export const RESILIENCE_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
  /\bunsafe\b/i,
  /\bdangerous\b/i,
  /\bbad portfolio\b/i,
  /\bgood portfolio\b/i,
  /\bguaranteed\b/i,
];

export function assertNoAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Resilience advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
