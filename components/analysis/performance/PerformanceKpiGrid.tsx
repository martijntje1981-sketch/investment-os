import {
  appCardValueClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
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
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <KpiCard
        label="Starting value"
        value={
          startingValue !== null
            ? formatPortfolioCurrency(startingValue)
            : "—"
        }
        hint={startingValue === null ? startingUnavailableReason : null}
      />
      <KpiCard
        label="Ending value"
        value={
          endingValue !== null ? formatPortfolioCurrency(endingValue) : "—"
        }
      />
      <KpiCard
        label="Investment return"
        value={
          investmentReturn !== null
            ? formatSignedPortfolioCurrency(investmentReturn)
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
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-red-700"
        : "text-slate-950";

  return (
    <article className="rounded-[16px] border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-3.5">
      <p className={`${appSectionLabelClass} text-[11px] sm:text-xs`}>
        {label}
      </p>
      <p className={`mt-1 ${appCardValueClass} text-[1.05rem] sm:text-[1.1rem] ${toneClass}`}>
        {value}
      </p>
      {secondaryValue ? (
        <p className={`mt-0.5 ${appSectionMetaClass} text-slate-600`}>
          {secondaryValue}
        </p>
      ) : null}
      {hint ? (
        <p className={`mt-1 ${appSectionMetaClass} text-[11px] leading-snug text-slate-500 sm:text-xs`}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}
