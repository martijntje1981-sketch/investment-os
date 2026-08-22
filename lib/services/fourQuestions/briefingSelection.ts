/**
 * Information-value selection for Four Questions.
 * Reuses coverage + holding-intelligence candidates. No new fetches.
 *
 * Portfolio materiality still wins. After the dominant fact is used once,
 * remaining questions prefer novelty and coverage over repeating the same
 * holding/theme unless a later insight is genuinely distinct and material.
 */

import { formatAllocationPercent } from "@/lib/services/classification";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";
import {
  buildPortfolioCoverageCandidates,
  coverageThemeFromCandidate,
  coverageThemeFromHolding,
  familyKeyForCoverageTheme,
  isMeaningfulCoverage,
  type PortfolioCoverageCandidate,
} from "@/lib/services/news/portfolioCoverage";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { ScenarioId, ScenarioResult } from "@/lib/services/scenarioEngine";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const UNUSUAL_MOVE_PERCENT = 2.5;
const MIN_COVERAGE_WEIGHT_PERCENT = 4;
const MIN_COVERAGE_CONTRIBUTION_PP = 0.25;
const CONCENTRATION_WEIGHT_THRESHOLD = 35;
const MIN_SELECT_SCORE = 0.28;
const MIN_FORWARD_SCENARIO_IMPACT_PERCENT = 1.5;

export type BriefingInsightAngle =
  | "daily_move"
  | "attribution"
  | "concentration"
  | "unusual_move"
  | "news"
  | "goal"
  | "scenario"
  | "event"
  | "structure";

export type BriefingInsightCandidate = {
  id: string;
  lens: FourQuestionId;
  themeKey: string;
  symbols: string[];
  angle: BriefingInsightAngle;
  answer: string;
  support: string | null;
  materiality: number;
  surprise: number;
  decisionRelevance: number;
  coverageValue: number;
  confidence: number;
  why: string;
};

export type BriefingRejection = BriefingInsightCandidate & {
  rejectedBecause: string;
  informationValue: number;
};

export type BriefingAttentionPick = {
  answer: string;
  support: string | null;
  quiet: boolean;
  themeKey: string | null;
  symbols: string[];
  angle: BriefingInsightAngle | null;
  whySelected: string;
  informationValue: number | null;
  rejected: BriefingRejection[];
};

export type BriefingSelectionTrace = {
  usedThemeKeys: string[];
  pick: BriefingAttentionPick;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function briefingThemesOverlap(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  return (
    familyKeyForCoverageTheme(left) === familyKeyForCoverageTheme(right) &&
    familyKeyForCoverageTheme(left) === "crypto"
  );
}

export function themeKeyForHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "name" | "instrumentName" | "providerSymbol" | "providerInstrumentType" | "assetType"
  >,
): string {
  return coverageThemeFromHolding(holding).key;
}

export function themeKeyForSymbol(
  symbol: string | null | undefined,
  holdings: StoredPortfolioHolding[],
): string | null {
  const key = symbol?.trim().toUpperCase();
  if (!key) return null;
  const holding = holdings.find((row) => row.symbol.trim().toUpperCase() === key);
  if (holding) return themeKeyForHolding(holding);
  return null;
}

export function themeKeyForScenarioId(scenarioId: ScenarioId | string | null | undefined): string | null {
  if (scenarioId === "bitcoin_minus_20") return "bitcoin";
  if (scenarioId === "crypto_minus_20") return "crypto";
  if (scenarioId === "global_equities_minus_20") return "global_equities";
  return null;
}

export function usedThemeKeysInclude(
  usedThemeKeys: readonly string[],
  themeKey: string | null | undefined,
): boolean {
  if (!themeKey) return false;
  return usedThemeKeys.some((used) => briefingThemesOverlap(used, themeKey));
}

export function informationValueScore(
  candidate: BriefingInsightCandidate,
  usedThemeKeys: readonly string[],
): number {
  const used = usedThemeKeysInclude(usedThemeKeys, candidate.themeKey);
  const novelty =
    !used
      ? 1
      : candidate.angle === "news"
        ? 0.25
        : candidate.angle === "unusual_move"
          ? 0.2
          : 0.05;
  // Q1 already spent the holding's portfolio impact. Same-theme news
  // must win on surprise/decision value, not on repeating that weight.
  const materiality =
    used && candidate.angle === "news"
      ? candidate.materiality * 0.4
      : candidate.materiality;
  const coverage = used ? candidate.coverageValue * 0.25 : candidate.coverageValue;
  return clamp01(
    materiality * 0.38 +
      candidate.surprise * 0.22 +
      candidate.decisionRelevance * 0.14 +
      novelty * 0.18 +
      coverage * 0.08,
  );
}

function signedMoveVerb(changePercent: number): string {
  return changePercent >= 0 ? "rose" : "fell";
}

function formatAbsPercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

function materialityFromWeightAndContribution(
  weightPercent: number | null,
  contributionPp: number | null,
): number {
  const weight = Math.abs(weightPercent ?? 0) / 100;
  const pp = Math.abs(contributionPp ?? 0) / 4;
  return clamp01(weight * 0.45 + pp * 0.55);
}

function meetsCoverageMateriality(row: PortfolioCoverageCandidate): boolean {
  const weight = row.portfolioWeight ?? 0;
  const pp = Math.abs(row.contributionPp ?? 0);
  return weight >= MIN_COVERAGE_WEIGHT_PERCENT || pp >= MIN_COVERAGE_CONTRIBUTION_PP;
}

function holdingHasCoverageSignal(row: PortfolioCoverageCandidate): boolean {
  const move = Math.abs(row.candidate.changePercent ?? 0);
  const unusual = move >= UNUSUAL_MOVE_PERCENT && meetsCoverageMateriality(row);
  const news =
    (row.directNewsAvailable || row.sectorThemeAvailable || row.macroContextAvailable) &&
    isMeaningfulCoverage(row.candidate) &&
    meetsCoverageMateriality(row);
  return unusual || news;
}

function newsMatchLabel(row: PortfolioCoverageCandidate): string {
  if (row.directNewsAvailable) return "holding";
  if (row.sectorThemeAvailable) return "sector";
  return "macro";
}

export function buildWhatMattersCoverageCandidates(input: {
  holdings: StoredPortfolioHolding[];
  intelligence: PersonalIntelligenceToday;
  newsItems?: NewsContentItem[] | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
  avoidDailyDriverSymbol?: string | null;
  usedThemeKeys?: readonly string[];
}): BriefingInsightCandidate[] {
  const avoid = input.avoidDailyDriverSymbol?.trim().toUpperCase() || null;
  const q1Theme = themeKeyForSymbol(avoid, input.holdings);
  const used = input.usedThemeKeys ?? (q1Theme ? [q1Theme] : []);
  const coverage = buildPortfolioCoverageCandidates({
    holdings: input.holdings,
    newsItems: input.newsItems,
    perspectiveVideos: input.perspectiveVideos,
  });
  const portfolioPercent = input.intelligence.portfolioMove?.todayPercent ?? 0;
  const candidates: BriefingInsightCandidate[] = [];

  for (const row of coverage) {
    if (row.candidate.assetType === "cash") continue;
    const symbol = row.symbol.trim().toUpperCase();
    const sameSymbol = Boolean(avoid && symbol === avoid);
    const themeKey = row.coverageKey;
    const change = row.candidate.changePercent;
    const move = Math.abs(change ?? 0);
    const weight = row.portfolioWeight ?? 0;
    const unusual =
      change != null &&
      move >= UNUSUAL_MOVE_PERCENT &&
      meetsCoverageMateriality(row);
    const news =
      (row.directNewsAvailable || row.sectorThemeAvailable || row.macroContextAvailable) &&
      isMeaningfulCoverage(row.candidate) &&
      meetsCoverageMateriality(row);

    if (sameSymbol && !news) continue;
    if (!holdingHasCoverageSignal(row)) continue;

    if (unusual && !sameSymbol) {
      const againstPortfolio =
        Number.isFinite(portfolioPercent) &&
        Math.abs(portfolioPercent) >= 0.15 &&
        Math.sign(change ?? 0) !== Math.sign(portfolioPercent);
      candidates.push({
        id: `unusual-${symbol}`,
        lens: "what_matters_now",
        themeKey,
        symbols: [symbol],
        angle: "unusual_move",
        answer: againstPortfolio
          ? `${row.candidate.name} ${signedMoveVerb(change ?? 0)} ${formatAbsPercent(change ?? 0)} even as the portfolio moved the other way.`
          : `${row.candidate.name} ${signedMoveVerb(change ?? 0)} ${formatAbsPercent(change ?? 0)} today.`,
        support:
          weight > 0
            ? `About ${formatAllocationPercent(weight)} of portfolio value.`
            : null,
        materiality: materialityFromWeightAndContribution(row.portfolioWeight, row.contributionPp),
        surprise: clamp01(move / 8),
        decisionRelevance: 0.7,
        coverageValue: usedThemeKeysInclude(used, themeKey) ? 0.15 : 0.85,
        confidence: 0.85,
        why: "Unusual holding move elsewhere in the portfolio.",
      });
    }

    if (news && (!sameSymbol || row.directNewsAvailable)) {
      const title = row.strongestItem?.title?.trim() || null;
      candidates.push({
        id: `news-${symbol}`,
        lens: "what_matters_now",
        themeKey,
        symbols: [symbol],
        angle: "news",
        answer: `${row.candidate.name} has relevant ${newsMatchLabel(row)} context in today's feed.`,
        support: title
          ? `${title} This is context, not proof that the news caused the price move.`
          : "Related context was found. It is not a confirmed explanation of the move.",
        materiality: materialityFromWeightAndContribution(row.portfolioWeight, row.contributionPp),
        surprise: row.directNewsAvailable ? 0.75 : 0.55,
        decisionRelevance: 0.8,
        coverageValue: usedThemeKeysInclude(used, themeKey) ? 0.2 : 0.9,
        confidence: row.confidence,
        why: "Trustworthy holding or sector context not used in the headline move.",
      });
    }
  }

  const leadingWeight = input.intelligence.holdingsWeights
    .slice()
    .sort((left, right) => right.weightPercent - left.weightPercent)[0];
  if (leadingWeight && leadingWeight.weightPercent >= CONCENTRATION_WEIGHT_THRESHOLD) {
    const leadingTheme =
      themeKeyForSymbol(leadingWeight.symbol, input.holdings) ??
      coverageThemeFromCandidate({
        symbol: leadingWeight.symbol,
        name: leadingWeight.name,
        isBitcoin: /bitcoin/i.test(leadingWeight.name),
        exposureGroupId: null,
        assetType: null,
      }).key;
    const sameAsDriver =
      Boolean(avoid && leadingWeight.symbol.trim().toUpperCase() === avoid) ||
      usedThemeKeysInclude(used, leadingTheme);
    const driverRow = [...input.intelligence.topContributors, ...input.intelligence.topDetractors].find(
      (row) => row.symbol.trim().toUpperCase() === (avoid ?? ""),
    );
    const driverWasMaterial =
      Math.abs(driverRow?.contributionPp ?? 0) >= MIN_COVERAGE_CONTRIBUTION_PP ||
      Math.abs(driverRow?.changePercent ?? 0) >= UNUSUAL_MOVE_PERCENT ||
      Math.abs(input.intelligence.portfolioMove?.todayPercent ?? 0) >= 0.5;
    if (!sameAsDriver && driverWasMaterial) {
      const symbol = leadingWeight.symbol.trim().toUpperCase();
      const group = input.intelligence.exposure?.groups.find((row) =>
        row.holdings.some((holding) => holding.symbol.trim().toUpperCase() === symbol),
      );
      candidates.push({
        id: `concentration-${symbol}`,
        lens: "what_matters_now",
        themeKey: leadingTheme,
        symbols: [symbol],
        angle: "concentration",
        answer: `${leadingWeight.name} remains your largest portfolio concentration.`,
        support:
          group && group.displayPercent >= 20
            ? `About ${formatAllocationPercent(group.displayPercent)} of portfolio value is linked to ${group.displayLabel.toLowerCase()} exposure.`
            : `About ${formatAllocationPercent(leadingWeight.weightPercent)} of portfolio value currently sits in one holding.`,
        materiality: clamp01(leadingWeight.weightPercent / 100),
        surprise: 0.25,
        decisionRelevance: 0.65,
        coverageValue: 0.35,
        confidence: 0.9,
        why: "Material concentration in a holding that is not today's headline driver.",
      });
    }
  }

  const fixedIncome = input.intelligence.exposure?.fixedIncome;
  const distinctiveFixedIncome =
    Boolean(fixedIncome) &&
    fixedIncome!.weightPercent >= 15 &&
    ((fixedIncome!.majorityIsLongDuration && fixedIncome!.majorityIsGovernment) ||
      fixedIncome!.weightPercent >= 25);
  if (fixedIncome && distinctiveFixedIncome) {
    candidates.push({
      id: "structure-fixed-income",
      lens: "what_matters_now",
      themeKey: "fixed_income",
      symbols: [],
      angle: "structure",
      answer:
        fixedIncome.majorityIsLongDuration && fixedIncome.majorityIsGovernment
          ? "Most of your bond exposure is concentrated in long-duration government debt."
          : `Fixed income now represents ${formatAllocationPercent(fixedIncome.weightPercent)} of your portfolio.`,
      support: null,
      materiality: clamp01(fixedIncome.weightPercent / 80),
      surprise: 0.2,
      decisionRelevance: 0.55,
      coverageValue: 0.7,
      confidence: 0.8,
      why: "Material fixed-income structure that the headline equity/crypto move can hide.",
    });
  }

  return candidates;
}

export function selectWhatMattersAttention(input: {
  holdings: StoredPortfolioHolding[];
  intelligence: PersonalIntelligenceToday;
  newsItems?: NewsContentItem[] | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
  avoidDailyDriverSymbol?: string | null;
  usedThemeKeys?: readonly string[];
  changeIntelligence?: ChangeIntelligenceSummary | null;
}): BriefingAttentionPick {
  const q1Theme = themeKeyForSymbol(input.avoidDailyDriverSymbol, input.holdings);
  const usedThemeKeys = input.usedThemeKeys ?? (q1Theme ? [q1Theme] : []);
  const candidates = buildWhatMattersCoverageCandidates({
    holdings: input.holdings,
    intelligence: input.intelligence,
    newsItems: input.newsItems,
    perspectiveVideos: input.perspectiveVideos,
    avoidDailyDriverSymbol: input.avoidDailyDriverSymbol,
    usedThemeKeys,
  });

  const changeStory =
    input.changeIntelligence?.status === "ready"
      ? input.changeIntelligence.primaryStory
      : null;
  if (changeStory) {
    const subject = changeStory.signal.subject?.trim() || null;
    const changeTheme =
      themeKeyForSymbol(subject, input.holdings) ??
      themeKeyForScenarioId(subject) ??
      "structure";
    const subjectIsHolding = Boolean(themeKeyForSymbol(subject, input.holdings));
    candidates.push({
      id: `change-${changeStory.signal.id}`,
      lens: "what_matters_now",
      themeKey: changeTheme,
      symbols: subjectIsHolding && subject ? [subject] : [],
      angle: "structure",
      answer: changeStory.headline,
      support: changeStory.relatedLines[0] ?? changeStory.meaning,
      materiality: changeStory.signal.materiality === "material" ? 0.85 : 0.45,
      surprise: 0.7,
      decisionRelevance: 0.85,
      coverageValue: usedThemeKeysInclude(usedThemeKeys, changeTheme) ? 0.2 : 0.6,
      confidence: 0.8,
      why: "Material portfolio-change story.",
    });
  }

  const rejected: BriefingRejection[] = [];
  let best: { candidate: BriefingInsightCandidate; score: number } | null = null;
  for (const candidate of candidates) {
    const score = informationValueScore(candidate, usedThemeKeys);
    const used = usedThemeKeysInclude(usedThemeKeys, candidate.themeKey);
    if (used && candidate.angle === "concentration") {
      rejected.push({
        ...candidate,
        informationValue: score,
        rejectedBecause: "Repeats the headline holding as concentration.",
      });
      continue;
    }
    if (used && candidate.angle !== "news" && score < 0.55) {
      rejected.push({
        ...candidate,
        informationValue: score,
        rejectedBecause: "Same theme as an earlier question without enough extra information value.",
      });
      continue;
    }
    if (score < MIN_SELECT_SCORE) {
      rejected.push({
        ...candidate,
        informationValue: score,
        rejectedBecause: "Below the information-value floor — would be trivia.",
      });
      continue;
    }
    if (!best || score > best.score) {
      if (best) {
        rejected.push({
          ...best.candidate,
          informationValue: best.score,
          rejectedBecause: "Outranked by a higher-information-value candidate.",
        });
      }
      best = { candidate, score };
    } else {
      rejected.push({
        ...candidate,
        informationValue: score,
        rejectedBecause: "Outranked by a higher-information-value candidate.",
      });
    }
  }

  if (!best) {
    return {
      answer: "Nothing else requires special attention beyond today’s move.",
      support: null,
      quiet: true,
      themeKey: null,
      symbols: [],
      angle: null,
      whySelected: "No additional portfolio-wide candidate cleared information-value and novelty.",
      informationValue: null,
      rejected,
    };
  }

  return {
    answer: best.candidate.answer,
    support: best.candidate.support,
    quiet: false,
    themeKey: best.candidate.themeKey,
    symbols: best.candidate.symbols,
    angle: best.candidate.angle,
    whySelected: best.candidate.why,
    informationValue: best.score,
    rejected,
  };
}

export function selectForwardScenario(
  profile: ResilienceProfile | null,
  usedThemeKeys: readonly string[],
): ScenarioResult | null {
  if (!profile || profile.status !== "ok") return null;
  const usable = profile.scenarioResults.filter(
    (row) =>
      row.status === "ok" &&
      row.estimatedPortfolioImpactPercent != null &&
      Number.isFinite(row.estimatedPortfolioImpactPercent) &&
      Math.abs(row.estimatedPortfolioImpactPercent) >= MIN_FORWARD_SCENARIO_IMPACT_PERCENT,
  );
  const ranked = [...usable].sort(
    (left, right) =>
      (left.estimatedPortfolioImpactPercent ?? 0) -
      (right.estimatedPortfolioImpactPercent ?? 0),
  );
  return (
    ranked.find(
      (row) => !usedThemeKeysInclude(usedThemeKeys, themeKeyForScenarioId(row.scenarioId)),
    ) ?? null
  );
}

export function evaluateBriefingSelection(input: {
  usedThemeKeys: readonly string[];
  pick: BriefingAttentionPick;
}): BriefingSelectionTrace {
  return {
    usedThemeKeys: [...input.usedThemeKeys],
    pick: input.pick,
  };
}
