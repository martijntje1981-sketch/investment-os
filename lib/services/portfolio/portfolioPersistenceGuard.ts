import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  portfolioContentFingerprint,
  portfolioFingerprint,
} from "@/lib/services/portfolio/idempotency";

export type PortfolioHoldingsSummary = {
  total: number;
  investments: number;
  crypto: number;
  cash: number;
};

export type PortfolioApplyDecision =
  | { apply: true; reason: string }
  | { apply: false; reason: string; stale: boolean };

export function summarizePortfolioHoldings(
  holdings: StoredPortfolioHolding[],
): PortfolioHoldingsSummary {
  const cash = holdings.filter((holding) => holding.assetType === "cash").length;
  const crypto = holdings.filter((holding) => holding.assetType === "crypto").length;
  const investments = holdings.filter(
    (holding) => holding.assetType === "investment",
  ).length;
  return {
    total: holdings.length,
    investments,
    crypto,
    cash,
  };
}

/** True when a save would drop all non-cash holdings while retaining cash. */
export function isSuspiciousCashOnlyShrink(
  previous: StoredPortfolioHolding[],
  next: StoredPortfolioHolding[],
): boolean {
  const before = summarizePortfolioHoldings(previous);
  const after = summarizePortfolioHoldings(next);
  const beforeNonCash = before.investments + before.crypto;
  const afterNonCash = after.investments + after.crypto;

  return beforeNonCash > 0 && afterNonCash === 0 && after.cash > 0;
}

/** Device-local save counter only. Never used to accept a cloud write. */
export function buildPortfolioSaveIdempotencyKey(
  userSub: string,
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  revision: number,
  portfolioId?: string | null,
): string {
  const fingerprint = portfolioContentFingerprint(holdings, goal).slice(0, 16);
  const book = portfolioId?.trim() ? portfolioId.trim() : "primary";
  return `save:${userSub}:${book}:${revision}:${fingerprint}`;
}

export function validatePortfolioBeforeSave(
  holdings: StoredPortfolioHolding[],
): { ok: true } | { ok: false; message: string } {
  if (!Array.isArray(holdings)) {
    return { ok: false, message: "Portfolio payload is invalid." };
  }

  for (const holding of holdings) {
    if (!holding?.id?.trim()) {
      return { ok: false, message: "Each holding must have a stable id." };
    }
    if (
      !holding.symbol?.trim() &&
      holding.assetType !== "cash"
    ) {
      return { ok: false, message: "Holdings must include a symbol." };
    }
    if (!Number.isFinite(holding.quantity)) {
      return { ok: false, message: "Each holding must include a valid quantity." };
    }
    if (holding.assetType === "crypto" && holding.quantity <= 0) {
      return { ok: false, message: "Crypto holdings must include a positive amount." };
    }
  }

  return { ok: true };
}

function remoteCoversLocalContent(
  local: StoredPortfolioHolding[],
  remote: StoredPortfolioHolding[],
  localGoal: GoalSettings | null,
  remoteGoal: GoalSettings | null,
): boolean {
  return (
    portfolioContentFingerprint(local, localGoal) ===
    portfolioContentFingerprint(remote, remoteGoal)
  );
}

/** Decides whether a remote snapshot should replace the current local portfolio. */
export function shouldApplyRemoteSnapshot(
  localHoldings: StoredPortfolioHolding[],
  remoteHoldings: StoredPortfolioHolding[],
  options?: {
    sentHoldings?: StoredPortfolioHolding[];
    localGoal?: GoalSettings | null;
    remoteGoal?: GoalSettings | null;
    context?: "hydrate" | "push_response" | "conflict_resolution";
  },
): PortfolioApplyDecision {
  const local = summarizePortfolioHoldings(localHoldings);
  const remote = summarizePortfolioHoldings(remoteHoldings);
  const sent = options?.sentHoldings
    ? summarizePortfolioHoldings(options.sentHoldings)
    : null;

  if (isSuspiciousCashOnlyShrink(localHoldings, remoteHoldings)) {
    return {
      apply: false,
      stale: true,
      reason: "remote_cash_only_shrink",
    };
  }

  if (
    sent &&
    isSuspiciousCashOnlyShrink(options!.sentHoldings!, remoteHoldings)
  ) {
    return {
      apply: false,
      stale: true,
      reason: "push_response_missing_investments",
    };
  }

  if (sent && remote.investments < sent.investments) {
    return {
      apply: false,
      stale: true,
      reason: "push_response_fewer_investments",
    };
  }

  if (
    sent &&
    remote.total < sent.total &&
    !remoteCoversLocalContent(
      options!.sentHoldings!,
      remoteHoldings,
      options?.localGoal ?? null,
      options?.remoteGoal ?? null,
    )
  ) {
    return {
      apply: false,
      stale: true,
      reason: "push_response_partial_snapshot",
    };
  }

  if (
    options?.context === "hydrate" &&
    local.investments > remote.investments &&
    remote.investments === 0 &&
    local.total > remote.total
  ) {
    return {
      apply: false,
      stale: true,
      reason: "hydrate_remote_missing_investments",
    };
  }

  if (
    options?.context === "hydrate" &&
    local.total > 0 &&
    remote.total > 0 &&
    remoteCoversLocalContent(
      localHoldings,
      remoteHoldings,
      options?.localGoal ?? null,
      options?.remoteGoal ?? null,
    )
  ) {
    return {
      apply: true,
      reason: "content_aligned",
    };
  }

  return {
    apply: true,
    reason: options?.context ?? "default_apply",
  };
}

export function portfolioPayloadFingerprint(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): string {
  return portfolioFingerprint(holdings, userSub);
}

export function countEnrichedHoldings(
  before: StoredPortfolioHolding[],
  after: StoredPortfolioHolding[],
): number {
  if (before.length !== after.length) return 0;

  return after.reduce((count, holding, index) => {
    const previous = before[index];
    if (!previous) return count;
    if (
      !previous.providerSymbol?.trim() &&
      holding.providerSymbol?.trim()
    ) {
      return count + 1;
    }
    return count;
  }, 0);
}
