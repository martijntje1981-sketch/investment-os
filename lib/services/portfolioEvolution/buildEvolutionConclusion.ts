/**
 * One primary Evolution conclusion + up to two supporting facts.
 * Evidence-backed. No advice. No invented causality.
 */

import { formatAllocationPercent } from "@/lib/services/classification/formatAllocationPercent";
import type {
  EvolutionBeforeNowMetric,
  EvolutionConclusion,
  EvolutionFundingVsMarket,
  EvolutionNowState,
} from "@/lib/services/portfolioEvolution/types";
import {
  buildPortfolioStanceFromInputs,
  collectStanceInputsFromNowState,
} from "@/lib/services/portfolioStance";

function metric(
  rows: EvolutionBeforeNowMetric[],
  kind: EvolutionBeforeNowMetric["kind"],
): EvolutionBeforeNowMetric | undefined {
  return rows.find((row) => row.kind === kind);
}

function groupWeight(
  state: EvolutionNowState,
  groupId: string,
): number {
  return (
    state.exposure.find((row) => row.groupId === groupId)?.weightPercent ?? 0
  );
}

export function buildEvolutionConclusion(input: {
  thenState: EvolutionNowState | null;
  nowState: EvolutionNowState;
  beforeNow: EvolutionBeforeNowMetric[];
  fundingVsMarket: EvolutionFundingVsMarket | null;
  recordedNetFunding: number;
}): EvolutionConclusion {
  const { thenState, nowState, beforeNow, fundingVsMarket } = input;
  const supporting: string[] = [];
  const crypto = metric(beforeNow, "crypto_exposure");
  const largest = metric(beforeNow, "largest_holding");
  const scenario = metric(beforeNow, "scenario_sensitivity");
  const value = metric(beforeNow, "value");
  const cash = metric(beforeNow, "cash");

  const valueUp =
    thenState?.portfolioValue != null &&
    nowState.portfolioValue != null &&
    nowState.portfolioValue > thenState.portfolioValue + 1;
  const valueDown =
    thenState?.portfolioValue != null &&
    nowState.portfolioValue != null &&
    nowState.portfolioValue < thenState.portfolioValue - 1;

  const cryptoNow = groupWeight(nowState, "crypto");
  const cryptoThen = thenState ? groupWeight(thenState, "crypto") : null;
  const cryptoUp = crypto != null && crypto.absDelta >= 3 && cryptoThen != null && cryptoNow > cryptoThen;
  const cryptoDown = crypto != null && crypto.absDelta >= 3 && cryptoThen != null && cryptoNow < cryptoThen;
  const concentrationUp =
    largest != null &&
    thenState?.largestHoldingWeightPercent != null &&
    nowState.largestHoldingWeightPercent != null &&
    nowState.largestHoldingWeightPercent >
      thenState.largestHoldingWeightPercent + 2;
  const concentrationDown =
    largest != null &&
    thenState?.largestHoldingWeightPercent != null &&
    nowState.largestHoldingWeightPercent != null &&
    nowState.largestHoldingWeightPercent <
      thenState.largestHoldingWeightPercent - 2;
  const scenarioWorse =
    scenario != null &&
    thenState?.scenarioImpactPercent != null &&
    nowState.scenarioImpactPercent != null &&
    nowState.scenarioImpactPercent < thenState.scenarioImpactPercent - 2;
  const cashUp = cash != null && cash.absDelta >= 3 && (thenState ? groupWeight(nowState, "cash") > groupWeight(thenState, "cash") : false);

  const thenStanceInputs = thenState ? collectStanceInputsFromNowState(thenState) : null;
  const nowStanceInputs = collectStanceInputsFromNowState(nowState);
  const thenStance = thenStanceInputs
    ? buildPortfolioStanceFromInputs(thenStanceInputs)
    : null;
  const nowStance = nowStanceInputs
    ? buildPortfolioStanceFromInputs(nowStanceInputs)
    : null;
  const stanceMoreOffensive =
    thenStance?.score != null &&
    nowStance?.score != null &&
    (nowStance.score - thenStance.score >= 6 ||
      (thenStance.bandId != null &&
        nowStance.bandId != null &&
        thenStance.bandId !== nowStance.bandId &&
        nowStance.score > thenStance.score));

  if (crypto) {
    supporting.push(`Crypto ${crypto.fromLabel} → ${crypto.toLabel}`);
  }
  if (largest && supporting.length < 2) {
    supporting.push(
      `${nowState.largestHoldingName ?? nowState.largestHoldingSymbol ?? "Largest holding"} ${largest.fromLabel} → ${largest.toLabel}`,
    );
  }
  if (scenario && supporting.length < 2) {
    supporting.push(
      `${nowState.scenarioName ?? "Modeled downside"} ${scenario.fromLabel} → ${scenario.toLabel}`,
    );
  }
  if (value && supporting.length < 2) {
    supporting.push(`Portfolio value ${value.fromLabel} → ${value.toLabel}`);
  }

  const sliced = supporting.slice(0, 2);

  if (!thenState) {
    return {
      primary: "Portfolio Evolution is building your history.",
      supporting: sliced,
      material: false,
    };
  }

  if (
    valueUp &&
    cryptoUp &&
    (nowState.bitcoinDependent || concentrationUp)
  ) {
    return {
      primary: "Your portfolio grew, but became more Bitcoin-dependent.",
      supporting: sliced,
      material: true,
    };
  }

  if (valueUp && cryptoUp) {
    return {
      primary: "Your portfolio grew while crypto exposure increased.",
      supporting: sliced,
      material: true,
    };
  }

  if (valueUp && stanceMoreOffensive) {
    return {
      primary:
        "Your portfolio grew and became more offensive in its positioning.",
      supporting: sliced,
      material: true,
    };
  }

  if (valueUp && concentrationUp) {
    return {
      primary: `Your portfolio grew, but became more concentrated in ${
        nowState.largestHoldingName ?? nowState.largestHoldingSymbol ?? "one holding"
      }.`,
      supporting: sliced,
      material: true,
    };
  }

  if (
    valueUp &&
    nowState.goalProgressPercent != null &&
    thenState.goalProgressPercent != null &&
    nowState.goalProgressPercent > thenState.goalProgressPercent + 0.4 &&
    scenarioWorse
  ) {
    return {
      primary:
        "Your portfolio moved closer to your goal, while modeled downside also increased.",
      supporting: sliced,
      material: true,
    };
  }

  if (
    input.recordedNetFunding > 0 &&
    cashUp &&
    (cryptoDown || concentrationDown)
  ) {
    return {
      primary:
        "Your portfolio became more balanced after recorded contributions increased cash and reduced concentration.",
      supporting: sliced,
      material: true,
    };
  }

  if (valueUp && cryptoDown && concentrationDown) {
    return {
      primary:
        "Your portfolio became more balanced while its value increased.",
      supporting: sliced,
      material: true,
    };
  }

  const materialFundingMove =
    fundingVsMarket &&
    fundingVsMarket.investmentMovementApproximate != null &&
    fundingVsMarket.valueChange != null &&
    thenState.portfolioValue != null &&
    Math.abs(fundingVsMarket.valueChange) >=
      Math.max(1000, thenState.portfolioValue * 0.02) &&
    Math.abs(fundingVsMarket.investmentMovementApproximate) >
      Math.abs(fundingVsMarket.recordedNetFunding);

  if (materialFundingMove) {
    return {
      primary:
        "Most recorded portfolio growth coincided with market movement rather than recorded funding.",
      supporting: sliced,
      material: true,
    };
  }

  if (valueUp && beforeNow.filter((row) => row.kind !== "value").length === 0) {
    return {
      primary:
        "Your portfolio value increased while its allocation remained structurally stable.",
      supporting: sliced,
      material: false,
    };
  }

  if (valueDown && cryptoUp) {
    return {
      primary: "Portfolio value declined while crypto exposure increased.",
      supporting: sliced,
      material: true,
    };
  }

  if (beforeNow.length === 0) {
    return {
      primary:
        "No material structural change appears in the available comparison window.",
      supporting: [],
      material: false,
    };
  }

  const lead = crypto ?? largest ?? scenario ?? cash ?? value;
  return {
    primary: lead
      ? `${lead.label} ${lead.fromLabel} → ${lead.toLabel}.`
      : "Your portfolio changed over this window.",
    supporting: sliced.filter((line) => !lead || !line.startsWith(lead.label)),
    material: beforeNow.some((row) => row.kind !== "value"),
  };
}

export function formatEvolutionMetricPercent(value: number): string {
  return formatAllocationPercent(value);
}
