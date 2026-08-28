"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Upload } from "lucide-react";

import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { PortfolioHeroAddMenu } from "@/components/portfolio/PortfolioHeroAddMenu";
import {
  appAnalysisUtilityButtonClass,
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import {
  holdingPriceHoldingsLabel,
  holdingValueUnavailableLabel,
  resolveHoldingDisplayPrice,
  resolveHoldingPriceTrustStatus,
} from "@/lib/client/holdingDisplayPrice";
import {
  getHoldingCostBasis,
  getHoldingMarketValue,
} from "@/lib/client/holdingValuation";
import {
  CRYPTO_PRICING_DISCLOSURE,
  formatCrypto24hChange,
} from "@/lib/client/cryptoPriceDisplay";
import {
  describeHoldingKindLabel,
  formatAllocationPercent,
} from "@/lib/services/classification";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import { holdingDetailPath, UPLOAD_PATH } from "@/lib/navigation/appRoutes";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function moveClass(value: number | null): string {
  if (value == null) return "text-white/55";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/70";
}

function holdingMovePercent(holding: StoredPortfolioHolding): number | null {
  if (holding.assetType === "cash") return null;
  if (isCryptoHolding(holding)) {
    const cryptoMove = holding.change24hPercent ?? holding.changePercent;
    return typeof cryptoMove === "number" && Number.isFinite(cryptoMove)
      ? cryptoMove
      : null;
  }
  if (
    typeof holding.changePercent === "number" &&
    Number.isFinite(holding.changePercent)
  ) {
    return holding.changePercent;
  }
  const value = getHoldingMarketValue(holding);
  const cost = getHoldingCostBasis(holding);
  if (value == null || !(cost > 0)) return null;
  return ((value - cost) / cost) * 100;
}

export function PortfolioHoldingsList({
  holdings,
  totalValue,
  formatEur,
  onAddInvestment,
  onAddCrypto,
  onAddCash,
  onEdit,
  onRemove,
}: {
  holdings: StoredPortfolioHolding[];
  totalValue: number;
  formatEur: (value: number) => string;
  onAddInvestment: () => void;
  onAddCrypto: () => void;
  onAddCash: () => void;
  onEdit: (holding: StoredPortfolioHolding) => void;
  onRemove: (holding: StoredPortfolioHolding) => void;
}) {
  const router = useRouter();
  const hasCrypto = holdings.some((holding) => isCryptoHolding(holding));

  return (
    <section
      className={`${appDarkCardClass} p-3.5 sm:p-4`}
      data-testid="portfolio-holdings"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`${appHeroMetricLabelClass} text-white`}>Holdings</h2>
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            {holdings.length} {holdings.length === 1 ? "position" : "positions"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={UPLOAD_PATH}
            className={appAnalysisUtilityButtonClass}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </Link>
          <PortfolioHeroAddMenu
            appearance="onDark"
            onAddInvestment={onAddInvestment}
            onAddCrypto={onAddCrypto}
            onAddCash={onAddCash}
          />
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="mt-3">
          <EmptyPortfolioGuide
            density="compact"
            title="No holdings yet"
            body="Import a CSV or Excel file, or add an investment, crypto or cash position to get started."
            className="border-0 shadow-none"
          />
        </div>
      ) : (
        <div className="mt-3 min-w-0">
          {hasCrypto ? (
            <p className={`mb-2 text-[12px] leading-snug ${appDashboardDarkMetaClass}`}>
              {CRYPTO_PRICING_DISCLOSURE}
            </p>
          ) : null}
          <ul className="divide-y divide-white/10">
            {holdings.map((holding) => {
              const holdingValue = getHoldingMarketValue(holding);
              const priceTrust = resolveHoldingPriceTrustStatus(holding);
              const priceTrustBadge = holdingPriceHoldingsLabel(priceTrust);
              const allocation =
                totalValue > 0 && holdingValue !== null
                  ? (holdingValue / totalValue) * 100
                  : 0;
              const allocationLabel =
                holdingValue === null
                  ? "—"
                  : formatAllocationPercent(allocation);
              const isCrypto = isCryptoHolding(holding);
              const kindLabel = describeHoldingKindLabel(holding);
              const move = holdingMovePercent(holding);
              const cryptoDisplay = isCrypto
                ? resolveHoldingDisplayPrice(holding)
                : null;
              const detailHref =
                holding.assetType === "cash"
                  ? null
                  : holdingDetailPath(holding.symbol);
              const quantityLabel =
                holding.assetType === "cash"
                  ? "Cash"
                  : `${holding.quantity.toLocaleString("en-GB")}${
                      isCrypto ? "" : " units"
                    }`;

              return (
                <li key={holding.id}>
                  <article
                    className={`flex min-w-0 items-start gap-2 py-2.5 ${
                      detailHref
                        ? "cursor-pointer rounded-lg hover:bg-white/[0.04]"
                        : ""
                    }`}
                    onClick={
                      detailHref
                        ? () => {
                            router.push(detailHref);
                          }
                        : undefined
                    }
                    onKeyDown={
                      detailHref
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(detailHref);
                            }
                          }
                        : undefined
                    }
                    tabIndex={detailHref ? 0 : undefined}
                    role={detailHref ? "link" : undefined}
                    aria-label={
                      detailHref
                        ? `Open ${holding.name} holding details`
                        : undefined
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                            holding.assetType === "cash"
                              ? "bg-emerald-400/15 text-emerald-200"
                              : isCrypto
                                ? "bg-violet-400/15 text-violet-200"
                                : "bg-white/10 text-white"
                          }`}
                        >
                          {holding.symbol}
                        </span>
                        <p className="min-w-0 truncate text-[14px] font-semibold text-white">
                          {holding.name}
                        </p>
                      </div>
                      <p className={`mt-0.5 text-[12px] ${appDashboardDarkMetaClass}`}>
                        {quantityLabel}
                        {kindLabel ? ` · ${kindLabel}` : ""}
                        {priceTrustBadge ? ` · ${priceTrustBadge}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-bold tabular-nums text-white">
                        {holdingValue === null
                          ? holdingValueUnavailableLabel(holding)
                          : formatEur(holdingValue)}
                      </p>
                      <p className={`text-[12px] tabular-nums ${appDashboardDarkMetaClass}`}>
                        {allocationLabel}
                      </p>
                      <p
                        className={`text-[12px] font-semibold tabular-nums ${moveClass(move)}`}
                      >
                        {holding.assetType === "cash"
                          ? "Stable"
                          : isCrypto
                            ? formatCrypto24hChange(
                                holding.change24hPercent ?? holding.changePercent,
                                holding.change24hAmount,
                              )
                            : move == null
                              ? "—"
                              : percent(move)}
                      </p>
                      {cryptoDisplay?.price == null && isCrypto ? (
                        <p className="text-[11px] font-medium text-amber-200">
                          Price pending
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 flex-col gap-1"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onEdit(holding)}
                        aria-label={`Edit ${holding.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(holding)}
                        aria-label={`Remove ${holding.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
