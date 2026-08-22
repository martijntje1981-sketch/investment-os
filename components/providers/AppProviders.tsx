"use client";

import { BaseCurrencyDisplayProvider } from "@/lib/client/baseCurrencyDisplay";
import { ActivePortfolioProvider } from "@/lib/client/useActivePortfolio";
import { UserPortfolioProvider } from "@/lib/client/useUserPortfolio";
import { SectionDeepLinkEffect } from "@/lib/client/useSectionDeepLink";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BaseCurrencyDisplayProvider>
      <ActivePortfolioProvider>
        <UserPortfolioProvider>
          <SectionDeepLinkEffect />
          {children}
        </UserPortfolioProvider>
      </ActivePortfolioProvider>
    </BaseCurrencyDisplayProvider>
  );
}
