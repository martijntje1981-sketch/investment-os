"use client";

import { Banknote, BriefcaseBusiness, RotateCcw, X } from "lucide-react";
import type { LegacyRecoveryOffer } from "@/lib/client/portfolioPricing";

type PortfolioRecoveryBannerProps = {
  offer: LegacyRecoveryOffer | null;
  onRecover: () => void;
  onDismiss: () => void;
};

export default function PortfolioRecoveryBanner({
  offer,
  onRecover,
  onDismiss,
}: PortfolioRecoveryBannerProps) {
  if (!offer) return null;

  return (
    <section className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-blue-700 shadow-sm">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Existing portfolio found on this browser
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              We found {offer.holdingCount}{" "}
              {offer.holdingCount === 1 ? "holding" : "holdings"} saved before
              sign-in scoping was enabled, including {offer.investmentCount}{" "}
              {offer.investmentCount === 1 ? "investment" : "investments"}
              {offer.cashCount > 0
                ? ` and ${offer.cashCount} cash ${offer.cashCount === 1 ? "balance" : "balances"}`
                : ""}
              .
            </p>
            {offer.cashCurrencies.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800">
                <Banknote className="h-4 w-4" />
                Cash currencies: {offer.cashCurrencies.join(", ")}
              </p>
            )}
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <BriefcaseBusiness className="h-4 w-4" />
              Recovery copies data into your account on this browser only.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss portfolio recovery"
          className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRecover}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          Recover portfolio
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
