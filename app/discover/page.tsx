"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

import {
  DiscoverDisclaimer,
  PortfolioBlindSpotsSection,
  RelatedInvestmentsSection,
  ThingsYouMayHaveMissedSection,
} from "@/components/discover/DiscoverSections";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { useDiscoverSnapshot } from "@/lib/client/discoverSnapshot";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

export default function DiscoverPage() {
  const { userSub, holdings, portfolioReady } = useUserPortfolio();
  const { goal } = useUserGoal();
  const { snapshot, isLoading } = useDiscoverSnapshot({
    userSub,
    holdings,
    goal,
    enabled: portfolioReady && holdings.length > 0,
  });

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  if (holdings.length === 0) {
    return (
      <main className="min-h-screen max-w-full overflow-x-clip bg-[#F4F7FB] px-4 pb-28 pt-6 text-slate-950 sm:px-8">
        <div className="mx-auto w-full min-w-0 max-w-3xl space-y-5">
          <header>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-violet-700">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              Discover
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
              Portfolio research context
            </h1>
          </header>
          <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-6">
            <p className="text-base leading-relaxed text-slate-600">
              Add holdings to unlock missed developments, coverage analysis, and
              related instruments to research.
            </p>
            <Link
              href="/upload"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
            >
              Add portfolio
            </Link>
          </section>
          <DiscoverDisclaimer />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#F4F7FB] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pt-8">
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-violet-700">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Discover
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
            Portfolio research context
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            What you may have missed, common coverage areas, and comparable
            instruments to research independently.
          </p>
          {snapshot?.sourceStatus.briefingGeneratedAt ? (
            <p className="mt-2 text-sm text-slate-500">
              Briefing as of{" "}
              {formatNewsRefreshedAt(snapshot.sourceStatus.briefingGeneratedAt)}
              {snapshot.freshness === "stale" ? " · cached briefing" : null}
            </p>
          ) : null}
        </header>

        {isLoading && !snapshot ? (
          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          </div>
        ) : snapshot ? (
          <>
            <ThingsYouMayHaveMissedSection items={snapshot.thingsYouMayHaveMissed} />
            <PortfolioBlindSpotsSection coverage={snapshot.portfolioCoverage} />
            <RelatedInvestmentsSection related={snapshot.relatedInvestmentGroups} />
          </>
        ) : (
          <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-6">
            <p className="text-base leading-relaxed text-slate-600">
              We&apos;re still building the latest portfolio briefing.
            </p>
          </section>
        )}

        <DiscoverDisclaimer />
      </div>
    </main>
  );
}
