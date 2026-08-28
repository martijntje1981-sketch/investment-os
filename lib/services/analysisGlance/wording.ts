import { STANCE_PROHIBITED_PATTERNS } from "@/lib/services/portfolioStance/wording";
import { SCENARIO_PROHIBITED_PATTERNS } from "@/lib/services/scenarioEngine/wording";

const ATTENTION_PROHIBITED_PATTERNS: RegExp[] = [
  ...STANCE_PROHIBITED_PATTERNS,
  ...SCENARIO_PROHIBITED_PATTERNS,
  /\bwill cause\b/i,
  /\bwill fall\b/i,
  /\byou should diversify\b/i,
];

export function assertNoAnalysisGlanceAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of ATTENTION_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Analysis glance advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
