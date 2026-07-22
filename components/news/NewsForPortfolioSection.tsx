import { ArrowUpRight } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { PortfolioNewsCard } from "@/lib/services/news/newsBriefingLayout";

const IMPACT_STYLES = {
  Positive: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Neutral: "bg-slate-100 text-slate-700 border-slate-200",
  Negative: "bg-red-50 text-red-800 border-red-200",
} as const;

export function NewsForPortfolioSection({
  cards,
}: {
  cards: PortfolioNewsCard[];
}) {
  return (
    <section aria-labelledby="news-for-portfolio-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="news-for-portfolio-heading"
          className="text-lg font-black tracking-[-0.02em] text-slate-950"
        >
          For Your Portfolio
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Headlines matched to your holdings, ordered by relevance.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          No important portfolio-specific developments today.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.item.id}>
              <article className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3.5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug text-slate-950">
                      {card.item.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {card.item.summary || card.item.description}
                    </p>
                    {card.affectedHoldings.length > 0 ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold">Affected holdings:</span>{" "}
                        {card.affectedHoldings.slice(0, 5).join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${IMPACT_STYLES[card.marketImpact]}`}
                      >
                        Market impact: {card.marketImpact}
                      </span>
                      {card.confidence ? (
                        <span className="text-xs text-slate-500">{card.confidence}</span>
                      ) : null}
                      <span className="text-xs text-slate-500">
                        {formatNewsPublishedAt(card.item.publishedAt)}
                      </span>
                    </div>
                  </div>
                  <a
                    href={card.item.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
