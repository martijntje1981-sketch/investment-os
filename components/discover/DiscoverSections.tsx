import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  DISCOVER_RESEARCH_DISCLAIMER,
  formatMissedItemMeta,
  missedItemKindLabel,
} from "@/lib/client/discoverFormatting";
import { MissedItemLink } from "@/components/news/IntelligenceArticleLink";
import type { DiscoverSnapshot } from "@/lib/services/discover/types";

export function DiscoverDisclaimer() {
  return (
    <p className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-500">
      {DISCOVER_RESEARCH_DISCLAIMER}
    </p>
  );
}

export function ThingsYouMayHaveMissedSection({
  items,
  compact = false,
}: {
  items: DiscoverSnapshot["thingsYouMayHaveMissed"];
  compact?: boolean;
}) {
  const visibleItems = compact ? items.slice(0, 2) : items;

  return (
    <section aria-labelledby="discover-missed-heading" className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="discover-missed-heading"
            className="text-lg font-black tracking-[-0.02em] text-slate-950"
          >
            Things You May Have Missed
          </h2>
          {!compact ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              High-value developments from your latest portfolio briefing.
            </p>
          ) : null}
        </div>
      </div>

      <ul className={`mt-4 space-y-3 ${compact ? "" : "sm:space-y-4"}`}>
        {visibleItems.map((item) => {
          const meta = formatMissedItemMeta(item);
          return (
            <li
              key={item.id}
              className="min-w-0 rounded-[18px] border border-slate-200 bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {missedItemKindLabel(item.kind)}
                </span>
              </div>
              <p className="mt-2 text-base font-semibold leading-snug text-slate-950">
                <MissedItemLink
                  headline={item.headline}
                  sourceUrl={item.sourceUrl}
                  sourceName={item.sourceName}
                  variant="light"
                />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {item.explanation}
              </p>
              {meta ? (
                <p className="mt-2 text-sm text-slate-500">{meta}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PortfolioBlindSpotsSection({
  coverage,
}: {
  coverage: DiscoverSnapshot["portfolioCoverage"];
}) {
  return (
    <section aria-labelledby="discover-blind-spots-heading" className="min-w-0">
      <h2
        id="discover-blind-spots-heading"
        className="text-lg font-black tracking-[-0.02em] text-slate-950"
      >
        Portfolio Blind Spots
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {coverage.summary}
      </p>
      <p className="mt-2 text-sm text-slate-500">{coverage.disclaimer}</p>

      <ul className="mt-4 space-y-3">
        {coverage.categories.map((category) => (
          <li
            key={category.id}
            className="min-w-0 rounded-[18px] border border-slate-200 bg-white px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-950">{category.label}</p>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                {category.level.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {category.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RelatedInvestmentsSection({
  related,
}: {
  related: DiscoverSnapshot["relatedInvestmentGroups"];
}) {
  const spotlight = related.spotlight;

  return (
    <section aria-labelledby="discover-related-heading" className="min-w-0">
      <h2
        id="discover-related-heading"
        className="text-lg font-black tracking-[-0.02em] text-slate-950"
      >
        Related Investments to Research
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Explore similar exposure and commonly compared instruments for independent
        research.
      </p>

      {!spotlight ? (
        <div className="mt-4 rounded-[18px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-base text-slate-600">
            No verified comparable instruments are available for the current holdings
            yet.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <article className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Today&apos;s holding spotlight
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {spotlight.name}
            </p>
            <p className="text-sm text-slate-500">{spotlight.symbol}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {spotlight.selectionReason}
            </p>
          </article>

          {spotlight.relatedInstruments.length > 0 ? (
            <ul className="space-y-3">
              {spotlight.relatedInstruments.map((instrument) => (
                <li
                  key={instrument.providerSymbol}
                  className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {instrument.relationshipLabel}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {instrument.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {instrument.symbol} · {instrument.exchange}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {instrument.researchContext}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {instrument.oneYearReturn.label}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-600">
              {spotlight.unavailableMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function DiscoverMissedTeaser({
  items,
  variant = "light",
}: {
  items: DiscoverSnapshot["thingsYouMayHaveMissed"];
  variant?: "light" | "dark";
}) {
  const visibleItems = items.slice(0, 2);
  const isDark = variant === "dark";

  return (
    <section
      aria-labelledby="discover-teaser-heading"
      className={`min-w-0 rounded-[16px] border px-4 py-3 ${
        isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="discover-teaser-heading"
            className={`text-xs font-semibold uppercase tracking-[0.08em] ${
              isDark ? "text-white/75" : "text-slate-500"
            }`}
          >
            Things You May Have Missed
          </h3>
          <ul className={`mt-2 space-y-2 ${isDark ? "text-white/85" : "text-slate-700"}`}>
            {visibleItems.map((item) => (
              <li key={item.id} className="min-w-0 text-sm leading-relaxed">
                <MissedItemLink
                  headline={item.headline}
                  sourceUrl={item.sourceUrl}
                  sourceName={item.sourceName}
                  variant={isDark ? "dark" : "light"}
                />
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/discover"
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
            isDark
              ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Discover
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
