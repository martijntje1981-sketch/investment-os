import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";

type GlanceTone = "neutral" | "positive" | "negative";

function toneClass(tone: GlanceTone): string {
  if (tone === "positive") return "text-emerald-300";
  if (tone === "negative") return "text-rose-300";
  return "text-white";
}

export function PortfolioGlance({
  valueLabel,
  valueAvailable,
  coverageMessage,
  resultLabel,
  resultAvailable,
  resultTone,
  resultDetail,
  cashLabel,
  mixCue,
}: {
  valueLabel: string;
  valueAvailable: boolean;
  coverageMessage: string | null;
  resultLabel: string;
  resultAvailable: boolean;
  resultTone: GlanceTone;
  resultDetail: string | null;
  cashLabel: string | null;
  mixCue: string | null;
}) {
  return (
    <section className="min-w-0" data-testid="portfolio-at-a-glance">
      <p className={appHeroMetricLabelClass}>Glance</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className={`text-[12px] ${appDashboardDarkMetaClass}`}>Value</p>
          <p className="mt-0.5 text-[1.35rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-white sm:text-[1.5rem]">
            {valueAvailable ? valueLabel : "Unavailable"}
          </p>
          {coverageMessage ? (
            <p className={`mt-1 text-[12px] leading-snug ${appDashboardDarkMetaClass}`}>
              {coverageMessage}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className={`text-[12px] ${appDashboardDarkMetaClass}`}>
            Since purchase
          </p>
          <p
            className={`mt-0.5 text-[1.35rem] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[1.5rem] ${toneClass(resultTone)}`}
          >
            {resultAvailable ? resultLabel : "Unavailable"}
          </p>
          {resultDetail ? (
            <p className={`mt-1 text-[12px] leading-snug ${appDashboardDarkMetaClass}`}>
              {resultDetail}
            </p>
          ) : null}
        </div>
        {cashLabel ? (
          <div className="min-w-0">
            <p className={`text-[12px] ${appDashboardDarkMetaClass}`}>Cash</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">
              {cashLabel}
            </p>
          </div>
        ) : null}
        {mixCue ? (
          <div className="min-w-0">
            <p className={`text-[12px] ${appDashboardDarkMetaClass}`}>Mix</p>
            <p className="mt-0.5 text-[15px] font-semibold text-white">{mixCue}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-2">
        <ConversionDetailsDisclosure compactTrigger tone="dark" />
      </div>
    </section>
  );
}
