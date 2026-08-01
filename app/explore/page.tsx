"use client";

import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  Newspaper,
  Sparkles,
  Waves,
} from "lucide-react";

import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import BottomNavigation from "@/components/home/BottomNav";
import { BackButton } from "@/components/layout/BackButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  appBrandSoftButtonClass,
  appCardClass,
  appCardPaddingClass,
  appPrimaryButtonClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { PUBLIC_EXPLORE_DESTINATIONS } from "@/lib/content/publicExplore";

const destinationIcons = {
  "/perspectives": Sparkles,
  "/market-pulse": Waves,
  "/news": Newspaper,
  "/supported-instruments": ListChecks,
} as const;

export default function ExplorePage() {
  const { userSub, holdings, portfolioReady } = useUserPortfolio();
  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });

  return (
    <>
      <PageContainer>
        <PageHero
          title="Explore Tobailey"
          subtitle="Browse Perspectives, Market Pulse, News and Supported Instruments — no sign-in required."
          actions={<BackButton fallbackHref="/" label="Home" />}
        />

        {portfolioReady && audience !== "authenticated_holdings" ? (
          <MakeTobaileyYoursCard audience={audience} showSoftLine />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {PUBLIC_EXPLORE_DESTINATIONS.map((destination) => {
            const Icon =
              destinationIcons[
                destination.href as keyof typeof destinationIcons
              ] ?? Sparkles;

            return (
              <section
                key={destination.href}
                className={`${appCardClass} ${appCardPaddingClass}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className={`mt-4 ${appSectionTitleClass}`}>
                  {destination.title}
                </h2>
                <p className={`mt-2 ${appSectionSubtitleClass}`}>
                  {destination.description}
                </p>
                <Link
                  href={destination.href}
                  className={`mt-5 ${appPrimaryButtonClass}`}
                >
                  {destination.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </section>
            );
          })}
        </div>

        {audience === "authenticated_holdings" ? (
          <div className="mt-2 flex justify-center">
            <Link href="/dashboard" className={appBrandSoftButtonClass}>
              Back to dashboard
            </Link>
          </div>
        ) : null}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
