"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";

import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { buildCryptoIntelligenceProfile } from "@/lib/services/cryptoIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function CompositionBar({
  bitcoin,
  ethereum,
  other,
}: {
  bitcoin: number;
  ethereum: number;
  other: number;
}) {
  const total = bitcoin + ethereum + other;
  if (total <= 0) return null;
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      aria-hidden
    >
      {bitcoin > 0 ? (
        <span
          className="bg-amber-500"
          style={{ width: `${(bitcoin / total) * 100}%` }}
        />
      ) : null}
      {ethereum > 0 ? (
        <span
          className="bg-indigo-500"
          style={{ width: `${(ethereum / total) * 100}%` }}
        />
      ) : null}
      {other > 0 ? (
        <span
          className="bg-slate-400"
          style={{ width: `${(other / total) * 100}%` }}
        />
      ) : null}
    </div>
  );
}

/**
 * Analysis — Crypto Intelligence (Phase 4A foundation).
 * Shown only when the user has material crypto / named BTC-ETH exposure.
 */
export function CryptoIntelligenceSection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const profile = useMemo(
    () => buildCryptoIntelligenceProfile(holdings),
    [holdings],
  );

  if (!profile.hasMaterialCrypto) {
    return null;
  }

  const primary = profile.conclusions[0]?.text ?? null;
  const secondary = profile.conclusions[1]?.text ?? null;
  const daily = profile.pulse.daily;

  return (
    <section
      id="crypto-intelligence"
      className={`mt-7 scroll-mt-24 overflow-hidden ${appCardClass}`}
      aria-labelledby="crypto-intelligence-heading"
      data-testid="crypto-intelligence-section"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-amber-900 to-slate-950 px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appHeroMetricLabelClass} text-amber-100`}
        >
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Crypto intelligence
        </div>
        <h2
          id="crypto-intelligence-heading"
          className={`mt-3 ${appAnalysisDarkTitleClass}`}
        >
          Crypto intelligence
        </h2>
        <p
          className={`mt-2 max-w-2xl ${appAnalysisDarkHeaderCopyClass} text-amber-50/95`}
        >
          How your crypto sleeve is structured from verified holdings — not a
          market forecast.
        </p>
      </div>

      <div className={`${appCardPaddingClass} space-y-4`}>
        {primary ? (
          <p className="text-[15px] font-semibold leading-snug text-slate-950">
            {primary}
          </p>
        ) : null}
        {secondary ? (
          <p className={appSectionBodyClass}>{secondary}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className={appSectionLabelClass}>Crypto share</p>
            <p className={`mt-1 ${appCardValueClass}`}>
              {formatPortfolioPercent(profile.cryptoPortfolioWeightPercent)}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {formatEur(profile.cryptoValue)} · {profile.cryptoInstrumentCount}{" "}
              instrument{profile.cryptoInstrumentCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className={appSectionLabelClass}>Today (crypto)</p>
            <p className={`mt-1 ${appCardValueClass}`}>
              {daily.available
                ? daily.direction === "up"
                  ? "Up"
                  : daily.direction === "down"
                    ? "Down"
                    : "Flat"
                : "Unavailable"}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {daily.contributionPp != null
                ? `${daily.contributionPp > 0 ? "+" : ""}${daily.contributionPp.toFixed(1)}pp portfolio contribution`
                : daily.available
                  ? "Contribution not estimable"
                  : "24h move data incomplete"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className={appSectionLabelClass}>BTC / ETH / Other</p>
          <CompositionBar
            bitcoin={profile.bitcoinValue}
            ethereum={profile.ethereumValue}
            other={profile.otherCryptoValue}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-slate-600">
            <span>
              BTC{" "}
              {profile.bitcoinOfCryptoPercent != null
                ? formatPortfolioPercent(profile.bitcoinOfCryptoPercent)
                : "—"}
            </span>
            <span>
              ETH{" "}
              {profile.ethereumOfCryptoPercent != null
                ? formatPortfolioPercent(profile.ethereumOfCryptoPercent)
                : "—"}
            </span>
            <span>
              Other{" "}
              {profile.otherOfCryptoPercent != null
                ? formatPortfolioPercent(profile.otherOfCryptoPercent)
                : "—"}
            </span>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 underline-offset-2 hover:underline"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? "Hide detail" : "Show detail"}
          </button>
          {detailsOpen ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className={appSectionMetaClass}>
                Shape: {profile.portfolioShape.replace(/_/g, " ")}
              </p>
              <p className={appSectionMetaClass}>
                Native crypto: {profile.nativeCryptoCount} · Named BTC/ETH
                exposure: {profile.etpOrNamedExposureCount}
              </p>
              <p className={appSectionMetaClass}>
                Move coverage: {profile.dataCoverage.moveDataCount}/
                {profile.dataCoverage.valuedCryptoCount}
              </p>
              <p className={appSectionMetaClass}>
                Weekly pulse: {profile.pulse.weekly.reason}
              </p>
              <p className={appSectionMetaClass}>
                Monthly pulse: {profile.pulse.monthly.reason}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
