"use client";

import { BaseCurrencyDisplayProvider } from "@/lib/client/baseCurrencyDisplay";
import { UserPortfolioProvider } from "@/lib/client/useUserPortfolio";
import { SectionDeepLinkEffect } from "@/lib/client/useSectionDeepLink";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BaseCurrencyDisplayProvider>
      <UserPortfolioProvider>
        <SectionDeepLinkEffect />
        {children}
      </UserPortfolioProvider>
    </BaseCurrencyDisplayProvider>
  );
}
