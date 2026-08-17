"use client";

import { useState } from "react";
import Link from "next/link";

import { DynamicScoreRing } from "@/components/dashboard/DynamicScoreRing";
import { PortfolioPulseDetailSheet } from "@/components/dashboard/PortfolioPulseDetailSheet";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type {
  DynamicPortfolioScore,
  PortfolioPulseResult,
} from "@/lib/services/portfolio/periodScores";

/**
 * Compact Daily + Weekly + Monthly pulse rings for the Dashboard hero.
 * Detail opens in a sheet — keeps Dashboard conclusion-first.
 */
export function HeroPortfolioPulse({
  pulse,
  attributionEnrichment = null,
}: {
  pulse: PortfolioPulseResult;
  attributionEnrichment?: {
    daily?: string[];
    weekly?: string[];
    monthly?: string[];
  } | null;
}) {
  const [active, setActive] = useState<DynamicPortfolioScore | null>(null);

  const notes =
    active?.id === "daily"
      ? (attributionEnrichment?.daily ?? [])
      : active?.id === "weekly"
        ? (attributionEnrichment?.weekly ?? [])
        : active?.id === "monthly"
          ? (attributionEnrichment?.monthly ?? [])
          : [];

  return (
    <div
      className="min-w-0"
      aria-label="Portfolio pulse"
      data-testid="hero-portfolio-pulse"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
          Portfolio Pulse
        </p>
        <Link
          href={DASHBOARD_DEEP_LINKS.scorecard}
          className="text-[11px] font-semibold text-brand hover:text-brand-hover"
        >
          Scorecard
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-3 items-start justify-items-center gap-0 sm:mt-2 sm:gap-1">
        <DynamicScoreRing
          score={pulse.daily}
          size={60}
          emphasis="primary"
          appearance="onDark"
          onActivate={() => setActive(pulse.daily)}
        />
        <DynamicScoreRing
          score={pulse.weekly}
          size={56}
          emphasis="default"
          appearance="onDark"
          onActivate={() => setActive(pulse.weekly)}
        />
        <DynamicScoreRing
          score={pulse.monthly}
          size={56}
          emphasis="default"
          appearance="onDark"
          onActivate={() => setActive(pulse.monthly)}
        />
      </div>

      <PortfolioPulseDetailSheet
        score={active}
        open={active != null}
        onClose={() => setActive(null)}
        attributionNotes={notes}
      />
    </div>
  );
}
