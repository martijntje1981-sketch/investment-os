import { ArrowUpRight } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsBriefHeadline } from "@/lib/services/news/newsBriefingLayout";

export function NewsMarketBriefSection({
  headlines,
}: {
  headlines: NewsBriefHeadline[];
}) {
  if (headlines.length === 0) {
    return (
      <section className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-black tracking-[-0.02em] text-slate-950">
          Today&apos;s Market Brief
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          No verified headlines are available in the current brief. Refresh when
          sources reconnect.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="news-market-brief-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="news-market-brief-heading"
          className="text-lg font-black tracking-[-0.02em] text-slate-950"
        >
          Today&apos;s Market Brief
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Concise headlines ranked by market impact, recency, and source quality.
        </p>
      </div>
      <ul className="space-y-2">
        {headlines.map((headline) => (
          <li key={headline.id}>
            <article className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-snug text-slate-950">
                    {headline.headline}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {headline.summary}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-800">
                      Why it matters:
                    </span>{" "}
                    {headline.whyItMatters}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>{headline.affectedMarket}</span>
                    <span aria-hidden>·</span>
                    <span>{formatNewsPublishedAt(headline.publishedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{headline.sourceName}</span>
                  </div>
                </div>
                {headline.canonicalUrl !== "#" ? (
                  <a
                    href={headline.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
