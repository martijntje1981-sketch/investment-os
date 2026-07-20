import type { DashboardSummary } from "@/lib/client/dashboardSummary";

const MAX_WORDS = 80;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function formatSignedCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `−${formatted}`;
}

function buildDriverSentence(summary: DashboardSummary): string {
  if (!summary.hasDailyData || !summary.topDailyDriver) {
    return "Today's move cannot be measured yet because previous-close prices are not available for all holdings.";
  }

  const { symbol, move } = summary.topDailyDriver;
  return `The largest daily driver is ${symbol}, contributing ${formatSignedCurrency(move)} to today's portfolio move.`;
}

function buildRiskSentence(summary: DashboardSummary): string {
  if (summary.concentrationSymbol && summary.concentrationWeightPercent >= 30) {
    return `The main risk is concentration: ${summary.concentrationSymbol} represents ${summary.concentrationWeightPercent.toFixed(1)}% of valued holdings.`;
  }

  if (summary.concentrationSymbol && summary.concentrationWeightPercent >= 20) {
    return `Portfolio risk is moderately shaped by ${summary.concentrationSymbol}, your largest position at ${summary.concentrationWeightPercent.toFixed(1)}%.`;
  }

  if (summary.observations[0]) {
    return `Key risk to monitor: ${summary.observations[0]}`;
  }

  return "Portfolio risk appears broadly distributed across your current holdings.";
}

function buildOpportunitySentence(summary: DashboardSummary): string {
  if (summary.goalCompleted) {
    return "Opportunity: your saved goal has been reached — review whether to reset the target or rebalance proceeds.";
  }

  if (summary.hasSavedGoal && summary.goalProgress >= 50) {
    return `Opportunity: you are ${summary.goalProgress.toFixed(1)}% toward your goal, so consistent contributions can compound from a stronger base.`;
  }

  if (summary.hasSavedGoal) {
    return "Opportunity: saving a clear goal and keeping contributions steady improves the odds of staying on track.";
  }

  return "Opportunity: set a goal to turn portfolio performance into a measurable long-term plan.";
}

function buildConclusionSentence(summary: DashboardSummary): string {
  if (!summary.hasDailyData) {
    return "Conclusion: refresh prices or upload complete holdings to unlock a fuller daily read.";
  }

  if (summary.todayChange >= 0) {
    return "Conclusion: today's move is constructive, but concentration and goal progress still deserve a quick review.";
  }

  return "Conclusion: today's pullback warrants monitoring, but long-term goal progress matters more than one session.";
}

export function buildDashboardInsight(summary: DashboardSummary): string {
  if (summary.holdingCount === 0) {
    return limitWords(
      "Upload your portfolio to receive a daily insight based on your holdings, goal progress, and verified market moves. Investment OS only reports what your saved data supports.",
      MAX_WORDS,
    );
  }

  const parts = [
    buildDriverSentence(summary),
    buildRiskSentence(summary),
    buildOpportunitySentence(summary),
    buildConclusionSentence(summary),
  ];

  let combined = parts.join(" ");
  if (countWords(combined) > MAX_WORDS) {
    combined = limitWords(combined, MAX_WORDS);
  }

  return combined;
}
