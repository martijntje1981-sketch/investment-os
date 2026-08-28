import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";
import { formatListingDetails } from "@/lib/services/instruments/listingConfirmation";
import { resolveListingQuoteCurrency } from "@/lib/services/instruments/quoteCurrency";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function listingFromHolding(
  holding: StoredPortfolioHolding,
): ResolvedInstrument {
  return {
    providerSymbol: holding.providerSymbol ?? null,
    instrumentName: holding.instrumentName ?? holding.name,
    exchange: holding.exchange ?? null,
    isin: holding.isin ?? null,
    matchMethod: (holding.matchMethod ?? "unresolved") as ResolvedInstrument["matchMethod"],
    confirmationSource: holding.confirmationSource as
      | ListingConfirmationSource
      | undefined,
    confidence: holding.matchConfidence ?? 0,
    requiresConfirmation: Boolean(holding.requiresConfirmation),
    warnings: holding.matchWarnings ?? [],
    pricingExchange: holding.pricingExchange,
    quoteCurrency: holding.quoteCurrency,
  };
}

export function ConfirmedListingIdentity({
  holding,
}: {
  holding: StoredPortfolioHolding;
}) {
  if (!holding.providerSymbol?.trim()) return null;

  const listing = listingFromHolding(holding);
  const details = formatListingDetails(listing);
  const currency = resolveListingQuoteCurrency({
    persistedQuoteCurrency: holding.quoteCurrency ?? null,
    providerSymbol: holding.providerSymbol,
    exchange: holding.exchange,
  });
  const currencyLabel = currency.currency ?? "Unresolved";

  return (
    <div
      className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3"
      data-testid="confirmed-listing-identity"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-emerald-800">
        Confirmed listing
      </p>
      <p className="mt-1.5 text-sm font-bold text-slate-950">
        {details.instrumentName}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-700">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Ticker
          </dt>
          <dd className="font-semibold text-slate-950">{details.ticker}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Listing
          </dt>
          <dd className="break-all font-semibold text-slate-950">
            {details.providerSymbol}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Venue
          </dt>
          <dd className="font-semibold text-slate-950">{details.exchange}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Currency
          </dt>
          <dd
            className={`font-semibold ${
              currency.currency ? "text-slate-950" : "text-amber-800"
            }`}
          >
            {currencyLabel}
          </dd>
        </div>
      </dl>
      {!currency.currency ? (
        <p className="mt-2 text-sm font-semibold text-amber-900">
          Quote currency is unresolved. Confirm the listing before adding.
        </p>
      ) : null}
    </div>
  );
}
