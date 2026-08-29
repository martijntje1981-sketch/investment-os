/**
 * Select one Dashboard personal-intelligence item above Your Holdings Today.
 * Reuses existing change-attention and Looking Ahead engines.
 * Skips static concentration and holding-move/news items already visible in the radar.
 */

import type { LookingAheadModel } from "@/lib/services/lookingAhead";
import type {
  PortfolioChangeAttention,
  PortfolioChangeSignal,
  PortfolioChangeType,
} from "@/lib/services/portfolioChangeDetection";

const DUPLICATES_HOLDINGS_TODAY: ReadonlySet<PortfolioChangeType> = new Set([
  "holding_contribution",
  "holding_move_with_context",
  "portfolio_relevant_news",
]);

export const PERSONAL_INTELLIGENCE_QUIET_TITLE =
  "Nothing material beyond today’s holding moves.";

export const PERSONAL_INTELLIGENCE_QUIET_SUPPORT =
  "Open a Four Questions hub only if you want more context.";

export type DashboardPersonalIntelligenceView =
  | {
      kind: "change";
      title: string;
      support: string;
      href: string;
      hrefLabel: string;
      windowLabel: string | null;
    }
  | {
      kind: "looking_ahead";
      title: string;
      support: string | null;
      href: string;
      hrefLabel: string;
      eventLabel: string | null;
      modeledDisclaimer: string | null;
    }
  | {
      kind: "quiet";
      title: string;
      support: string;
    };

function isMaterialChangeSignal(signal: PortfolioChangeSignal): boolean {
  return !DUPLICATES_HOLDINGS_TODAY.has(signal.type);
}

function pickMaterialChange(
  attention: PortfolioChangeAttention | null,
): PortfolioChangeSignal | null {
  if (!attention || attention.status !== "attention") {
    return null;
  }

  const candidates = [
    attention.primary,
    ...attention.secondary,
    ...attention.ranked,
  ].filter((signal): signal is PortfolioChangeSignal => Boolean(signal));

  return candidates.find(isMaterialChangeSignal) ?? null;
}

function isUsefulLookingAhead(model: LookingAheadModel | null): boolean {
  if (!model || model.status !== "ready") return false;
  if (model.primaryKind === "concentration" || model.primaryKind === "none") {
    return false;
  }
  return model.primaryKind === "modeled_scenario";
}

export function selectDashboardPersonalIntelligence(input: {
  changeAttention: PortfolioChangeAttention | null;
  lookingAhead: LookingAheadModel | null;
}): DashboardPersonalIntelligenceView {
  const change = pickMaterialChange(input.changeAttention);
  if (change) {
    return {
      kind: "change",
      title: change.title,
      support: change.whyItMatters,
      href: change.destination.href,
      hrefLabel: change.destination.label,
      windowLabel:
        input.changeAttention?.window.kind !== "unavailable"
          ? input.changeAttention?.window.label ?? null
          : null,
    };
  }

  const ahead = input.lookingAhead;
  if (isUsefulLookingAhead(ahead) && ahead) {
    return {
      kind: "looking_ahead",
      title: ahead.headline,
      support: ahead.support,
      href: ahead.explore.href,
      hrefLabel: ahead.explore.label,
      eventLabel: ahead.event
        ? `${ahead.event.title} · ${ahead.event.whenLabel}`
        : null,
      modeledDisclaimer: ahead.modeledDisclaimer,
    };
  }

  return {
    kind: "quiet",
    title: PERSONAL_INTELLIGENCE_QUIET_TITLE,
    support: PERSONAL_INTELLIGENCE_QUIET_SUPPORT,
  };
}
