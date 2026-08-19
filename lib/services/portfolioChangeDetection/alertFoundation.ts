/**
 * Alert candidate shape for later in-app / email / push delivery.
 * Phase 13 detects the right things; it does not send them.
 */

import type {
  AlertCandidate,
  PortfolioChangeSignal,
} from "@/lib/services/portfolioChangeDetection/types";

export function toAlertCandidate(
  signal: PortfolioChangeSignal,
): AlertCandidate {
  return {
    signalId: signal.id,
    detectedAt: signal.detectedAt,
    channels: [
      {
        channel: "in_app",
        ready: true,
        reason: "Surfaced in the Since your last check attention card.",
      },
      {
        channel: "email",
        ready: false,
        reason:
          "Email delivery is not implemented in this phase. Period review email remains a separate opt-in.",
      },
      {
        channel: "push",
        ready: false,
        reason: "Push notification delivery is not implemented.",
      },
    ],
  };
}

export function toAlertCandidates(
  signals: PortfolioChangeSignal[],
): AlertCandidate[] {
  return signals.map(toAlertCandidate);
}
