"use client";

import Link from "next/link";
import {
  DiscoverDisclaimer,
  PortfolioBlindSpotsSection,
  RelatedInvestmentsSection,
  ThingsYouMayHaveMissedSection,
} from "@/components/discover/DiscoverSections";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
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
    return <AppPageLoading />;
  }

  if (holdings.length === 0) {
    return (
      <PageContainer>
        <PageHero
          title="Discover"
          subtitle="Explore investment ideas, themes and opportunities."
        />
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
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHero
        title="Discover"
        subtitle="Explore investment ideas, themes and opportunities."
        stats={
          snapshot?.sourceStatus.briefingGeneratedAt ? (
            <p className="text-sm text-slate-400">
              Briefing as of{" "}
              {formatNewsRefreshedAt(snapshot.sourceStatus.briefingGeneratedAt)}
              {snapshot.freshness === "stale" ? " · cached briefing" : null}
            </p>
          ) : null
        }
      />

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
    </PageContainer>
  );
}
