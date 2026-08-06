"use client";

import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";
import { PortfolioSetupOnboarding } from "@/components/onboarding/PortfolioSetupOnboarding";
import { resolvePortfolioSetupVariant } from "@/lib/client/portfolioSetup";

type DashboardEmptyStateProps = {
  userSub?: string | null;
};

export function DashboardEmptyState({ userSub = null }: DashboardEmptyStateProps) {
  const variant = resolvePortfolioSetupVariant(userSub);

  return (
    <PortfolioSetupOnboarding
      variant={variant}
      footer={<DashboardMarketStatus lastUpdatedAt={null} />}
    />
  );
}
