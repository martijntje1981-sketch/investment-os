"use client";

import {
  appCardValueClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";

export function PerformanceKpiGrid({
  startingValue,
  endingValue,
  investmentReturn,
  investmentReturnPercent,
  startingUnavailableReason,
  returnUnavailableReason,
}: {
  startingValue: number | null;
  endingValue: number | null;
  investmentReturn: number | null;
  investmentReturnPercent: number | null;
  startingUnavailableReason?: string | null;
  returnUnavailableReason?: string | null;
}) {
  const { formatEur } = useBaseCurrencyDisplay();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <KpiCard
        label="Starting value"
        value={
          startingValue !== null
            ? formatEur(startingValue)
            : "—"
        }
        hint={startingValue === null ? startingUnavailableReason : null}
      />
      <KpiCard
        label="Ending value"
        value={
          endingValue !== null ? formatEur(endingValue) : "—"
        }
      />
      <KpiCard
        label="Investment return"
        value={
          investmentReturn !== null
            ? formatSignedPortfolioCurrency(investmentReturn, formatEur)
            : "—"
        }
        secondaryValue={
          investmentReturn !== null && investmentReturnPercent !== null
            ? formatSignedPortfolioPercent(investmentReturnPercent)
            : null
        }
        hint={investmentReturn === null ? returnUnavailableReason : null}
        tone={
          investmentReturn === null
            ? "neutral"
            : investmentReturn > 0
              ? "positive"
              : investmentReturn < 0
                ? "negative"
                : "neutral"
        }
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  secondaryValue,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  secondaryValue?: string | null;
  hint?: string | null;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : "text-white";

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
      <p className={appHeroMetricLabelClass}>{label}</p>
      <p className={`mt-1 ${appCardValueClass} text-base ${toneClass}`}>
        {value}
      </p>
      {secondaryValue ? (
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>{secondaryValue}</p>
      ) : null}
      {hint ? (
        <p className={`mt-1 ${appDashboardDarkMetaClass} text-[11px] leading-snug`}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}
