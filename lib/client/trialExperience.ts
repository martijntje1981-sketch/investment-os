/**
 * Shared Premium-trial / example-portfolio presentation helpers.
 * Status kind still comes from resolveExampleStatus — this layer only
 * formats countdown and UI flags consistently.
 */

import {
  EXAMPLE_KEEP_PORTFOLIO_HREF,
  getExampleDaysRemaining,
} from "@/lib/services/examplePortfolio/types";
import type { ExampleStatusKind } from "@/lib/services/examplePortfolio/resolveExampleStatus";

export const TRIAL_UPGRADE_HREF = EXAMPLE_KEEP_PORTFOLIO_HREF;
export const TRIAL_FINAL_WINDOW_MS = 48 * 60 * 60 * 1000;

export type TrialExperiencePhase =
  | "none"
  | "active"
  | "final_48h"
  | "expired"
  | "paid";

export type TrialExperienceView = {
  phase: TrialExperiencePhase;
  daysRemaining: number;
  /** Compact global indicator label, or null when none should show. */
  indicatorLabel: string | null;
  isFinal48Hours: boolean;
  showTrialMessaging: boolean;
  showDemoHoldingsMessaging: boolean;
  upgradeHref: string;
};

export function isTrialFinal48Hours(
  expiresAtIso: string | null | undefined,
  now = new Date(),
): boolean {
  if (!expiresAtIso) return false;
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) return false;
  const ms = expires - now.getTime();
  return ms > 0 && ms <= TRIAL_FINAL_WINDOW_MS;
}

/**
 * Premium trial indicator copy. Never invents dates; never returns negatives.
 * Paid/converted callers should pass kind "converted" / phase paid.
 */
export function formatPremiumTrialIndicatorLabel(
  expiresAtIso: string | null | undefined,
  now = new Date(),
  options?: { hasDemoHoldings?: boolean },
): string {
  const prefix = options?.hasDemoHoldings
    ? "Demo Portfolio"
    : "7-day Personal Trial";

  if (!expiresAtIso) {
    return prefix;
  }
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) {
    return prefix;
  }
  if (expires <= now.getTime()) {
    return `${prefix} ended · Upgrade to continue`;
  }

  const expiresLocal = new Date(expires);
  if (expiresLocal.toDateString() === now.toDateString()) {
    return `${prefix} · Expires today`;
  }

  const days = getExampleDaysRemaining(expiresAtIso, now);
  if (days <= 0) {
    return `${prefix} ended · Upgrade to continue`;
  }
  if (days === 1) {
    return `${prefix} · 1 day remaining`;
  }
  return `${prefix} · ${days} days remaining`;
}

export function buildTrialExperienceView(input: {
  kind: ExampleStatusKind | "none";
  expiresAt: string | null;
  daysRemaining: number;
  /** True only when the account still carries seeded demo holdings. */
  hasDemoHoldings?: boolean;
  now?: Date;
}): TrialExperienceView {
  const now = input.now ?? new Date();
  const upgradeHref = TRIAL_UPGRADE_HREF;
  const hasDemoHoldings = Boolean(input.hasDemoHoldings);

  if (input.kind === "converted") {
    return {
      phase: "paid",
      daysRemaining: 0,
      indicatorLabel: null,
      isFinal48Hours: false,
      showTrialMessaging: false,
      showDemoHoldingsMessaging: false,
      upgradeHref,
    };
  }

  if (input.kind === "expired") {
    return {
      phase: "expired",
      daysRemaining: 0,
      indicatorLabel: hasDemoHoldings
        ? "Demo Portfolio ended · Upgrade to continue"
        : "7-day Personal Trial ended · Upgrade to continue",
      isFinal48Hours: false,
      showTrialMessaging: true,
      showDemoHoldingsMessaging: false,
      upgradeHref,
    };
  }

  if (input.kind === "active" && input.expiresAt) {
    const daysRemaining = Math.max(
      0,
      getExampleDaysRemaining(input.expiresAt, now),
    );
    const final48 = isTrialFinal48Hours(input.expiresAt, now);
    return {
      phase: final48 ? "final_48h" : "active",
      daysRemaining,
      indicatorLabel: formatPremiumTrialIndicatorLabel(input.expiresAt, now, {
        hasDemoHoldings,
      }),
      isFinal48Hours: final48,
      showTrialMessaging: true,
      showDemoHoldingsMessaging: hasDemoHoldings,
      upgradeHref,
    };
  }

  return {
    phase: "none",
    daysRemaining: 0,
    indicatorLabel: null,
    isFinal48Hours: false,
    showTrialMessaging: false,
    showDemoHoldingsMessaging: false,
    upgradeHref,
  };
}
