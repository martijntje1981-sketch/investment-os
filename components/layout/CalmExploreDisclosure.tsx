"use client";

import type { ReactNode } from "react";

import {
  appAnalysisUtilityButtonClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";

export function CalmExploreDisclosure({
  title = "Explore",
  description,
  open,
  onToggle,
  children,
  testId = "calm-explore",
}: {
  title?: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="min-w-0" data-testid={testId} data-expanded={open ? "true" : "false"}>
      <p className={appHeroMetricLabelClass}>{title}</p>
      {description ? (
        <p className={`mt-1 ${appDashboardDarkMetaClass}`}>{description}</p>
      ) : null}
      <button
        type="button"
        className={`mt-3 ${appAnalysisUtilityButtonClass}`}
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        onClick={onToggle}
      >
        {open ? "Show less" : "Show all"}
      </button>
      <div hidden={!open} className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}
