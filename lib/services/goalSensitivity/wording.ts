/**
 * Educational copy + advisory-language guards for Goal Sensitivity.
 */

export const GOAL_SENSITIVITY_PROHIBITED_PATTERNS: RegExp[] = [
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
];

export function assertNoAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of GOAL_SENSITIVITY_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Goal Sensitivity advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}

export const MARKET_ASSUMPTIONS = [
  "Illustrative estimate based on the selected hypothetical market scenario and your current saved goal assumptions.",
  "Uses the existing goal engine with a temporary portfolio value — stored goal settings are not changed.",
  "Does not model probability of success, Monte Carlo paths, or recommended contribution changes.",
] as const;

export const MARKET_LIMITATIONS = [
  "Hypothetical only — not a prediction of future goal outcomes.",
  "Projected dates appear only when the existing goal engine can estimate them from current contribution and return assumptions.",
] as const;

export const CONTRIBUTION_ASSUMPTIONS = [
  "Illustrative changes to monthly contribution only — portfolio value and return assumptions stay at current settings.",
  "Temporary overrides for education; saved goal contribution is not modified.",
] as const;

export const CONTRIBUTION_LIMITATIONS = [
  "Does not recommend a contribution amount.",
  "Projection uses the same deterministic goal engine path as the Goals page.",
] as const;

export const TARGET_YEAR_ASSUMPTIONS = [
  "Illustrative one-year extension of the saved target year only.",
  "Portfolio value, contribution, and expected return stay unchanged.",
] as const;

export const TARGET_YEAR_LIMITATIONS = [
  "Changing the target year mainly affects schedule status relative to the deadline, not the contribution-based completion estimate itself.",
] as const;
