"use client";

import Link from "next/link";
import {
  ArrowRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { selectDashboardMarketPulseItems } from "@/lib/client/selectDashboardMarketPulseItems";
import { useDashboardMarketPulsePreview } from "@/lib/client/useDashboardMarketPulsePreview";
import { formatQuotePeriodLabel } from "@/lib/services/marketPulse/quoteModel";
import type { MarketPulseAsset } from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatPrice(asset: MarketPulseAsset): string {
  const price = asset.displayPrice ?? asset.price;
  if (price == null) return "—";
  return price.toLocaleString("en-GB", {
    maximumFractionDigits: price >= 1000 ? 0 : 2,
  });
}

function moveTone(asset: MarketPulseAsset): {
  className: string;
  Icon: typeof TrendingUp;
  directionLabel: string;
} {
  const change = asset.quoteChangePercent;
  if (change == null || !Number.isFinite(change)) {
    return {
      className: "text-slate-600",
      Icon: Minus,
      directionLabel: "unchanged or unavailable",
    };
  }
  if (change > 0) {
    return {
      className: "text-emerald-700",
      Icon: TrendingUp,
      directionLabel: "up",
    };
  }
  if (change < 0) {
    return {
      className: "text-red-700",
      Icon: TrendingDown,
      directionLabel: "down",
    };
  }
  return {
    className: "text-slate-600",
    Icon: Minus,
    directionLabel: "flat",
  };
}

function MarketStripItem({ asset }: { asset: MarketPulseAsset }) {
  const tone = moveTone(asset);
  const Icon = tone.Icon;
  const change = asset.quoteChangePercent;
  const period = formatQuotePeriodLabel(asset.quoteChangePeriod);
  const changeLabel =
    change == null || !Number.isFinite(change)
      ? "Unavailable"
      : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  const stale =
    asset.availability === "stale" || asset.availability === "partial";
  const shortName = asset.symbol || asset.name;

  return (
    <article
      className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3"
      aria-label={`${asset.name}: ${formatPrice(asset)}, ${changeLabel} ${period}, ${tone.directionLabel}${stale ? ", data may be stale" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold tracking-[-0.02em] text-slate-950">
            {shortName}
          </p>
          <p className={`mt-0.5 truncate ${appSectionMetaClass}`}>
            {asset.name}
          </p>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${tone.className}`} aria-hidden />
      </div>
      <p className="mt-2 truncate text-[15px] font-bold tabular-nums tracking-[-0.02em] text-slate-950">
        {formatPrice(asset)}
      </p>
      <p
        className={`mt-1 text-[13px] font-semibold tabular-nums ${tone.className}`}
      >
        <span aria-hidden>{changeLabel}</span>
        <span className="sr-only">
          {changeLabel} {tone.directionLabel}
        </span>
        <span className="ml-1 font-medium text-slate-500">· {period}</span>
      </p>
      {stale ? (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700">
          {asset.availability}
        </p>
      ) : null}
    </article>
  );
}

export function DashboardMarketPulseCard({
  holdings = [],
  leadLabel,
  moveLabel,
}: {
  holdings?: StoredPortfolioHolding[];
  leadLabel?: string | null;
  moveLabel?: string | null;
}) {
  const { snapshot, isLoading, error } = useDashboardMarketPulsePreview(
    holdings,
    true,
  );
  const items = selectDashboardMarketPulseItems(snapshot, 3);

  return (
    <section
      aria-labelledby="market-pulse-preview-heading"
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
      aria-busy={isLoading}
    >
      <DashboardSectionHeader
        titleId="market-pulse-preview-heading"
        title="Market Pulse"
        subtitle="Markets linked to your portfolio"
        icon={<Waves className="h-5 w-5" />}
        iconToneClassName="bg-amber-50 text-amber-700"
        bordered={false}
      />
      <div className={`${appCardPaddingClass} space-y-3.5 pt-0`}>
        {items.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
            {items.map((asset) => (
              <MarketStripItem key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <p className={`text-[15px] font-semibold text-slate-950`}>
            {isLoading
              ? "Loading linked markets…"
              : (leadLabel ??
                "Open Market Pulse for commodities, crypto and linked markets.")}
          </p>
        )}

        {moveLabel && items.length === 0 ? (
          <p className={`${appSectionBodyClass} text-slate-600`}>{moveLabel}</p>
        ) : null}

        {error && items.length === 0 ? (
          <p className={appSectionMetaClass} role="status">
            Live strip unavailable right now. Open Market Pulse for the full
            board.
          </p>
        ) : null}

        {snapshot?.leadInsight && items.length > 0 ? (
          <p className={`line-clamp-2 ${appSectionMetaClass}`}>
            {snapshot.leadInsight}
          </p>
        ) : null}

        <Link
          href="/market-pulse"
          className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
        >
          Open Market Pulse
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
