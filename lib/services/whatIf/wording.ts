/**
 * Educational copy + language guards for What-if Intelligence.
 * Consequences only — no advice, forecasts, or probability claims.
 */

export const WHAT_IF_DISCLAIMER = "Modeled scenario — not a forecast.";

export const WHAT_IF_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
  /\bbest amount\b/i,
  /\bguaranteed\b/i,
  /\binvest €/i,
  /\bcontribute more\b/i,
  /\blikely\b/i,
  /\bprobably\b/i,
  /\bprobability\b/i,
  /\bTobailey expected return\b/i,
  /\bTobailey expects\b/i,
  /\bwill lose\b/i,
  /\bwill happen\b/i,
];

export function assertNoWhatIfAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of WHAT_IF_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `What-if advisory or prediction language detected (${pattern}): ${blob}`,
      );
    }
  }
}

export const WHAT_IF_SHARED_ASSUMPTIONS = [
  "Illustrative estimate from current holdings, the selected modeled scenario, and your saved goal settings.",
  "Temporary exploration only — saved holdings, goal, contribution, and planning assumption are not changed.",
  "The percentage used for projections is a user planning assumption, not a Tobailey return figure.",
] as const;

export const WHAT_IF_SHARED_LIMITATIONS = [
  "Hypothetical only — not a prediction of future portfolio or goal outcomes.",
  "Does not assign odds to outcomes or model correlations, recovery, or action prompts.",
  "Estimated completion appears only when the existing goal engine can calculate it from the current contribution and planning assumption.",
] as const;

export const FIXED_INCOME_UNAVAILABLE_REASON =
  "Interest-rate sensitivity cannot yet be modeled precisely because duration data is unavailable.";
