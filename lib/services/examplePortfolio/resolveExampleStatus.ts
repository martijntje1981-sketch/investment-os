/**
 * Canonical Example Portfolio status — DB entitlement wins over stale metadata.
 */

import type { User } from "@supabase/supabase-js";

import { isEntitlementPeriodExpired } from "@/lib/services/examplePortfolio/entitlements";
import {
  formatExampleBannerLabel,
  getExampleDaysRemaining,
  type ExamplePortfolioEntitlement,
  type ExamplePortfolioTemplate,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";

export type ExampleStatusKind =
  "none" | "reserved" | "active" | "expired" | "converted";

export type ResolvedExampleStatus = {
  kind: ExampleStatusKind;
  template: ExamplePortfolioTemplate | null;
  expiresAt: string | null;
  startedAt: string | null;
  daysRemaining: number;
  bannerLabel: string | null;
  /** True when user_metadata claims example but DB does not. */
  staleMetadata: boolean;
  /** Metadata patch that restores consistency with DB truth (or clears stale). */
  metadataPatch: ExamplePortfolioUserMetadata | null;
};

function emptyStatus(
  overrides: Partial<ResolvedExampleStatus> = {},
): ResolvedExampleStatus {
  return {
    kind: "none",
    template: null,
    expiresAt: null,
    startedAt: null,
    daysRemaining: 0,
    bannerLabel: null,
    staleMetadata: false,
    metadataPatch: null,
    ...overrides,
  };
}

function metaClaimsExample(
  meta: ExamplePortfolioUserMetadata | null | undefined,
): boolean {
  if (!meta) return false;
  return (
    meta.account_mode === "example" ||
    Boolean(meta.example_expires_at) ||
    Boolean(meta.example_started_at) ||
    Boolean(meta.pending_example_template)
  );
}

/**
 * Resolve Example Portfolio status from entitlement row + optional metadata.
 * Entitlement (and conversion) always override stale user_metadata.
 */
export function resolveExampleStatus(input: {
  entitlement: ExamplePortfolioEntitlement | null;
  metadata?: ExamplePortfolioUserMetadata | null;
  now?: Date;
}): ResolvedExampleStatus {
  const now = input.now ?? new Date();
  const entitlement = input.entitlement;
  const metadata = input.metadata ?? null;
  const staleWithoutRow = !entitlement && metaClaimsExample(metadata);

  if (!entitlement) {
    if (staleWithoutRow) {
      return emptyStatus({
        staleMetadata: true,
        metadataPatch: {
          account_mode: "standard",
          example_converted_at: null,
          pending_example_template: null,
          example_started_at: undefined,
          example_expires_at: undefined,
        },
      });
    }
    return emptyStatus();
  }

  if (entitlement.converted_at) {
    const metaConverted = Boolean(metadata?.example_converted_at);
    const metaStandard = metadata?.account_mode === "standard";
    return {
      kind: "converted",
      template: entitlement.template,
      expiresAt: entitlement.expires_at,
      startedAt: entitlement.started_at,
      daysRemaining: 0,
      bannerLabel: null,
      staleMetadata: !metaConverted || !metaStandard,
      metadataPatch:
        !metaConverted || !metaStandard
          ? {
              account_mode: "standard",
              example_portfolio_type: entitlement.template,
              example_started_at: entitlement.started_at ?? undefined,
              example_expires_at: entitlement.expires_at ?? undefined,
              example_converted_at: entitlement.converted_at,
              pending_example_template: null,
            }
          : null,
    };
  }

  if (isEntitlementPeriodExpired(entitlement, now.getTime())) {
    const expiresAt = entitlement.expires_at as string;
    const metaExpired =
      metadata?.account_mode === "example" &&
      metadata.example_expires_at === expiresAt;
    return {
      kind: "expired",
      template: entitlement.template,
      expiresAt,
      startedAt: entitlement.started_at,
      daysRemaining: 0,
      bannerLabel: formatExampleBannerLabel(expiresAt, now),
      staleMetadata: !metaExpired,
      metadataPatch: !metaExpired
        ? {
            account_mode: "example",
            example_portfolio_type: entitlement.template,
            example_started_at: entitlement.started_at ?? undefined,
            example_expires_at: expiresAt,
            example_converted_at: null,
            pending_example_template: null,
          }
        : null,
    };
  }

  if (entitlement.expires_at && entitlement.started_at) {
    const expiresAt = entitlement.expires_at;
    const daysRemaining = getExampleDaysRemaining(expiresAt, now);
    const metaActive =
      metadata?.account_mode === "example" &&
      metadata.example_expires_at === expiresAt &&
      !metadata.example_converted_at;
    return {
      kind: "active",
      template: entitlement.template,
      expiresAt,
      startedAt: entitlement.started_at,
      daysRemaining,
      bannerLabel: formatExampleBannerLabel(expiresAt, now),
      staleMetadata: !metaActive,
      metadataPatch: !metaActive
        ? {
            account_mode: "example",
            example_portfolio_type: entitlement.template,
            example_started_at: entitlement.started_at,
            example_expires_at: expiresAt,
            example_converted_at: null,
            pending_example_template: null,
          }
        : null,
    };
  }

  // Reserved but clock not started — not an active example for the banner.
  const metaPremature =
    metadata?.account_mode === "example" &&
    Boolean(metadata.example_expires_at);
  return {
    kind: "reserved",
    template: entitlement.template,
    expiresAt: null,
    startedAt: null,
    daysRemaining: 0,
    bannerLabel: null,
    staleMetadata:
      metaPremature || Boolean(metadata?.account_mode === "example"),
    metadataPatch:
      metadata?.account_mode === "example"
        ? {
            account_mode: "standard",
            example_portfolio_type: entitlement.template,
            pending_example_template: entitlement.template,
            example_expires_at: undefined,
            example_started_at: undefined,
            example_converted_at: null,
          }
        : null,
  };
}

export function resolveExampleStatusForUser(input: {
  user: User;
  entitlement: ExamplePortfolioEntitlement | null;
  now?: Date;
}): ResolvedExampleStatus {
  return resolveExampleStatus({
    entitlement: input.entitlement,
    metadata: (input.user.user_metadata ?? {}) as ExamplePortfolioUserMetadata,
    now: input.now,
  });
}

export function shouldShowExampleBanner(
  status: Pick<ResolvedExampleStatus, "kind">,
): boolean {
  return status.kind === "active";
}
