/**
 * In-memory, user-scoped Example/product status for the current session.
 * Deduplicates concurrent GETs and reuses a resolved result across remounts.
 * Never written to localStorage. Server/API remain authoritative.
 */

import { EXAMPLE_STATUS_CHANGED_EVENT } from "@/lib/client/exampleFirstRun";
import {
  maxPortfoliosForTier,
  resolveProductAccess,
  type ProductAccess,
  type ProductAccessTier,
} from "@/lib/services/productAccess";
import type { ExampleStatusKind } from "@/lib/services/examplePortfolio/resolveExampleStatus";
import type { ExampleTrialKind } from "@/lib/services/examplePortfolio/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";

export const EXAMPLE_PORTFOLIO_STATUS_PATH = "/api/example-portfolio/status";

export type ExamplePortfolioStatusBody = {
  kind?: ExampleStatusKind | "none";
  expiresAt?: string | null;
  daysRemaining?: number;
  trialKind?: ExampleTrialKind | null;
  showBanner?: boolean;
  bannerLabel?: string | null;
  startedAt?: string | null;
  productAccess?: {
    tier: ProductAccessTier;
    intelligenceDepth: FourQuestionsIntelligenceDepth;
    isCompleteTrial: boolean;
    daysRemaining: number;
    trialIndicatorLabel: string | null;
    upgradeHref: string;
    upgradeCtaLabel: string;
    isDemo: boolean;
  };
};

export type ExamplePortfolioStatusPayload = {
  success?: boolean;
  status?: ExamplePortfolioStatusBody;
};

const ANON_KEY = "anon";

type SessionEntry = {
  userKey: string;
  payload: ExamplePortfolioStatusPayload | null;
  resolved: boolean;
  inFlight: Promise<ExamplePortfolioStatusPayload> | null;
  /** True when the in-flight GET was started by an invalidation. */
  force: boolean;
  requestId: number;
};

let nextRequestId = 0;

let session: SessionEntry | null = null;
const listeners = new Set<() => void>();

let fetchesStartedForTests = 0;
let fetchesReusedForTests = 0;
let statusChangedBound = false;

function userKey(userSub: string | null | undefined): string {
  return userSub && userSub.length > 0 ? userSub : ANON_KEY;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function bindStatusChangedListener(): void {
  if (statusChangedBound || typeof window === "undefined") return;
  statusChangedBound = true;
  window.addEventListener(EXAMPLE_STATUS_CHANGED_EVENT, () => {
    void fetchExamplePortfolioStatus({
      userSub: session && session.userKey !== ANON_KEY ? session.userKey : null,
      force: true,
    });
  });
}

function isActiveExpiryDue(payload: ExamplePortfolioStatusPayload | null): boolean {
  const status = payload?.status;
  if (!status || status.kind !== "active" || !status.expiresAt) return false;
  const expires = Date.parse(status.expiresAt);
  return Number.isFinite(expires) && expires <= Date.now();
}

export function __countExampleStatusFetchesForTests(): number {
  return fetchesStartedForTests;
}

export function __countExampleStatusReusesForTests(): number {
  return fetchesReusedForTests;
}

export function __resetExamplePortfolioStatusCacheForTests(): void {
  session = null;
  fetchesStartedForTests = 0;
  fetchesReusedForTests = 0;
}

export function subscribeExamplePortfolioStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function peekExamplePortfolioStatus(
  userSub: string | null | undefined,
): ExamplePortfolioStatusPayload | null {
  const key = userKey(userSub);
  if (!session || session.userKey !== key || !session.payload) {
    return null;
  }
  if (isActiveExpiryDue(session.payload)) {
    return null;
  }
  return session.payload;
}

export function clearExamplePortfolioStatusCache(): void {
  session = null;
  emit();
}

export const DEFAULT_FREE_PRODUCT_ACCESS: ProductAccess = resolveProductAccess({
  exampleKind: "none",
});

export function productAccessFromStatusPayload(
  payload: ExamplePortfolioStatusPayload | null,
): ProductAccess {
  const status = payload?.status;
  if (!status) return DEFAULT_FREE_PRODUCT_ACCESS;

  if (status.productAccess) {
    const pa = status.productAccess;
    return {
      tier: pa.tier,
      intelligenceDepth: pa.intelligenceDepth,
      isCompleteTrial: pa.isCompleteTrial,
      daysRemaining: pa.daysRemaining,
      expiresAt: status.expiresAt ?? null,
      trialIndicatorLabel: pa.trialIndicatorLabel,
      upgradeHref: pa.upgradeHref,
      upgradeCtaLabel: pa.upgradeCtaLabel,
      isDemo: pa.isDemo,
      preservesUserData: true,
      maxPortfolios: maxPortfoliosForTier(pa.tier),
    };
  }

  return resolveProductAccess({
    exampleKind: status.kind ?? "none",
    trialKind: status.trialKind ?? null,
    expiresAt: status.expiresAt ?? null,
    daysRemaining: status.daysRemaining ?? 0,
  });
}

export function isExampleActiveFromStatusPayload(
  payload: ExamplePortfolioStatusPayload | null,
): boolean {
  const status = payload?.status;
  if (!status) return false;
  return status.kind === "active" || status.showBanner === true;
}

async function postStatusRequest(): Promise<ExamplePortfolioStatusPayload> {
  fetchesStartedForTests += 1;
  const response = await fetch(EXAMPLE_PORTFOLIO_STATUS_PATH, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    return { success: false };
  }
  const payload = (await response.json()) as ExamplePortfolioStatusPayload;
  if (!payload.success) {
    return { success: false };
  }
  return payload;
}

/**
 * Fetch or reuse session status. Pass `userSub: null` only when logged out —
 * that clears the cache and does not hit the network.
 */
export async function fetchExamplePortfolioStatus(input: {
  userSub: string | null;
  force?: boolean;
}): Promise<ExamplePortfolioStatusPayload> {
  bindStatusChangedListener();
  const key = userKey(input.userSub);

  if (key === ANON_KEY) {
    session = null;
    emit();
    return {
      success: true,
      status: {
        kind: "none",
        expiresAt: null,
        daysRemaining: 0,
        showBanner: false,
      },
    };
  }

  if (session && session.userKey !== key) {
    session = null;
  }

  if (
    !input.force &&
    session &&
    session.userKey === key &&
    session.resolved &&
    session.payload &&
    !isActiveExpiryDue(session.payload)
  ) {
    fetchesReusedForTests += 1;
    return session.payload;
  }

  if (session && session.userKey === key && session.inFlight) {
    if (!input.force || session.force) {
      fetchesReusedForTests += 1;
      return session.inFlight;
    }
  }

  const requestId = ++nextRequestId;
  const request = postStatusRequest()
    .then((payload) => {
      if (session && session.requestId === requestId && session.userKey === key) {
        const keepLast =
          payload.success === false && session.payload?.success === true;
        if (!keepLast) {
          session.payload = payload;
        }
        session.resolved = true;
        session.inFlight = null;
        session.force = false;
        emit();
        return session.payload ?? payload;
      }
      return payload;
    })
    .catch(() => {
      const fallback: ExamplePortfolioStatusPayload = { success: false };
      if (session && session.requestId === requestId && session.userKey === key) {
        const keepLast = session.payload?.success === true;
        if (!keepLast) {
          session.payload = fallback;
        }
        session.resolved = true;
        session.inFlight = null;
        session.force = false;
        emit();
        return session.payload ?? fallback;
      }
      return fallback;
    });

  session = {
    userKey: key,
    payload: session?.userKey === key ? session.payload : null,
    resolved: false,
    inFlight: request,
    force: Boolean(input.force),
    requestId,
  };
  emit();
  return request;
}
