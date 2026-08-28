import Link from "next/link";

import { NEWS_GLANCE_FAMILY_ACCENT } from "@/components/news/glance/newsGlanceVisuals";
import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { NewsGlanceMarketTile } from "@/lib/services/newsGlance";

export function NewsAroundTheMarkets({
  tiles,
}: {
  tiles: NewsGlanceMarketTile[];
}) {
  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="news-around-markets"
      aria-labelledby="news-around-markets-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="news-around-markets-heading">
          Around the markets
        </p>
        <div
          className="mt-3 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
          data-testid="news-around-markets-scroller"
        >
          {tiles.map((tile) => (
            <MarketTile key={tile.id} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketTile({ tile }: { tile: NewsGlanceMarketTile }) {
  const accent = NEWS_GLANCE_FAMILY_ACCENT[tile.visualFamily];

  return (
    <Link
      href={tile.href}
      className="relative w-[5.85rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 sm:w-auto"
      data-testid="news-around-markets-tile"
      data-region={tile.id}
      data-available={tile.available ? "true" : "false"}
    >
      <span
        className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${accent.bar}`}
        aria-hidden
      />
      <p className="pl-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white">
        {tile.label}
      </p>
      <p
        className={`mt-1 pl-2 text-[13px] font-semibold leading-tight ${
          tile.statusLabel === "Higher"
            ? "text-emerald-400"
            : tile.statusLabel === "Lower"
              ? "text-rose-400"
              : appDashboardDarkMetaClass
        }`}
      >
        {tile.statusLabel}
      </p>
      {tile.signal ? (
        <p className={`mt-1 line-clamp-2 pl-2 text-[11px] leading-snug ${appDashboardDarkMetaClass}`}>
          {tile.signal}
        </p>
      ) : null}
    </Link>
  );
}
