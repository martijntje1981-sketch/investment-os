/**
 * Authenticated C2 persistence after POST /api/prices.
 * Uses the PriceService quotes and FX already resolved for this request.
 * Does not fetch EODHD, FX, or prices again.
 *
 * Disabled by default. createAdminClient and the writer run only after
 * the flag, session identity, and personal Product Access succeed.
 */

import type { User } from "@supabase/supabase-js";

import { buildCanonicalCryptoQuoteCandidate } from "@/lib/services/canonicalQuotes/buildCanonicalCryptoQuoteCandidate";
import { isCanonicalCryptoQuotePersistenceEnabled } from "@/lib/services/canonicalQuotes/canonicalCryptoQuotePersistenceFlag";
import type { CanonicalCryptoQuotePersistenceEnv } from "@/lib/services/canonicalQuotes/canonicalCryptoQuotePersistenceFlag";
import {
  CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY,
  persistCanonicalCryptoQuote,
  type CanonicalQuoteClient,
} from "@/lib/services/canonicalQuotes/persistCanonicalCryptoQuote";
import { resolveCanonicalQuoteWriteAccess } from "@/lib/services/canonicalQuotes/resolveCanonicalQuoteWriteAccess";
import type { CanonicalCryptoQuotePersistStatus } from "@/lib/services/canonicalQuotes/types";
import { resolveProductAccessFromAuthUser } from "@/lib/services/productAccess/resolveFromAuthUser";
import type { PriceHoldingInput, PricePayload } from "@/lib/services/prices/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CanonicalQuotePersistAggregate = {
  attempted: number;
  created: number;
  improved: number;
  already_current: number;
  skipped_stale: number;
  skipped_invalid: number;
  forbidden: number;
  error: number;
  skipped_unauthenticated: number;
  skipped_demo: number;
  skipped_unresolved: number;
  skipped_disabled: number;
  skipped_cache: number;
  skipped_estimate: number;
};

const EMPTY_AGGREGATE: CanonicalQuotePersistAggregate = {
  attempted: 0,
  created: 0,
  improved: 0,
  already_current: 0,
  skipped_stale: 0,
  skipped_invalid: 0,
  forbidden: 0,
  error: 0,
  skipped_unauthenticated: 0,
  skipped_demo: 0,
  skipped_unresolved: 0,
  skipped_disabled: 0,
  skipped_cache: 0,
  skipped_estimate: 0,
};

export type PersistCanonicalCryptoQuotesAfterPricesInput = {
  payload: PricePayload;
  requestHoldings: PriceHoldingInput[];
  estimateOnly?: boolean;
  env?: CanonicalCryptoQuotePersistenceEnv;
  getSessionUser?: () => Promise<User | null>;
  resolveProductAccess?: typeof resolveProductAccessFromAuthUser;
  createQuoteClient?: () => CanonicalQuoteClient | null;
  persistQuote?: typeof persistCanonicalCryptoQuote;
};

function emptyAggregate(
  patch: Partial<CanonicalQuotePersistAggregate>,
): CanonicalQuotePersistAggregate {
  return { ...EMPTY_AGGREGATE, ...patch };
}

export function logCanonicalCryptoQuotePersistAggregate(
  aggregate: CanonicalQuotePersistAggregate,
): void {
  console.info("[canonical-crypto-quote]", aggregate);
}

function bump(
  aggregate: CanonicalQuotePersistAggregate,
  status: CanonicalCryptoQuotePersistStatus,
): void {
  aggregate.attempted += 1;
  aggregate[status] += 1;
}

function normalizeSymbol(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function holdingIdFromRequest(holding: PriceHoldingInput): string | null {
  if (typeof holding.id !== "string") return null;
  const trimmed = holding.id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function matchPriceForHolding(
  holding: PriceHoldingInput,
  prices: PricePayload["prices"],
): PricePayload["prices"][number] | null {
  const holdingProvider = normalizeSymbol(holding.providerSymbol);
  const holdingSymbol = normalizeSymbol(holding.symbol);
  const matched = prices.find((price) => {
    const priceProvider = normalizeSymbol(price.providerSymbol);
    const priceSymbol = normalizeSymbol(price.symbol);
    if (holdingProvider && priceProvider && holdingProvider === priceProvider) {
      return true;
    }
    return Boolean(holdingSymbol) && holdingSymbol === priceSymbol;
  });
  return matched ?? null;
}

async function defaultGetSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function persistCanonicalCryptoQuotesAfterPrices(
  input: PersistCanonicalCryptoQuotesAfterPricesInput,
): Promise<CanonicalQuotePersistAggregate> {
  try {
    const env = input.env ?? process.env;
    if (!isCanonicalCryptoQuotePersistenceEnabled(env)) {
      const aggregate = emptyAggregate({ skipped_disabled: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    if (input.estimateOnly === true || input.payload.refreshSummary?.estimateOnly === true) {
      const aggregate = emptyAggregate({ skipped_estimate: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    if (input.payload.quoteSource === "cache" || input.payload.quoteSource == null) {
      const aggregate = emptyAggregate({ skipped_cache: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    const getSessionUser = input.getSessionUser ?? defaultGetSessionUser;
    const user = await getSessionUser();
    if (!user?.id) {
      const aggregate = emptyAggregate({ skipped_unauthenticated: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    const resolveAccess =
      input.resolveProductAccess ?? resolveProductAccessFromAuthUser;
    const productAccess = await resolveAccess(user);
    const access = resolveCanonicalQuoteWriteAccess(productAccess);
    if (access.outcome === "skip_demo") {
      const aggregate = emptyAggregate({ skipped_demo: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }
    if (access.outcome === "unresolved") {
      const aggregate = emptyAggregate({ skipped_unresolved: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    const createQuoteClient =
      input.createQuoteClient ??
      (() => createAdminClient() as CanonicalQuoteClient | null);
    const client = createQuoteClient();
    if (!client) {
      const aggregate = emptyAggregate({ error: 1 });
      logCanonicalCryptoQuotePersistAggregate(aggregate);
      return aggregate;
    }

    const persistQuote = input.persistQuote ?? persistCanonicalCryptoQuote;
    const aggregate = emptyAggregate({});
    const fxAt = input.payload.generatedAt;
    const jobs: Array<Promise<void>> = [];

    for (const holding of input.requestHoldings) {
      const holdingId = holdingIdFromRequest(holding);
      if (!holdingId) continue;
      const price = matchPriceForHolding(holding, input.payload.prices);
      if (!price) continue;

      const built = buildCanonicalCryptoQuoteCandidate({
        holdingId,
        price,
        fxRates: input.payload.fxRates,
        fxAt,
        quoteSource: input.payload.quoteSource,
        estimateOnly: false,
      });
      if (!built.ok) {
        aggregate.attempted += 1;
        aggregate.skipped_invalid += 1;
        continue;
      }

      jobs.push(
        persistQuote({
          client,
          authority: CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY,
          userId: user.id,
          holdingId,
          candidate: built.candidate,
        }).then((result) => {
          bump(aggregate, result.status);
        }),
      );
    }

    const settled = await Promise.allSettled(jobs);
    for (const result of settled) {
      if (result.status === "rejected") {
        aggregate.error += 1;
      }
    }

    logCanonicalCryptoQuotePersistAggregate(aggregate);
    return aggregate;
  } catch {
    const aggregate = emptyAggregate({ error: 1 });
    logCanonicalCryptoQuotePersistAggregate(aggregate);
    return aggregate;
  }
}
