"use client";

import { BaseCurrencyDisplayProvider } from "@/lib/client/baseCurrencyDisplay";
import { SectionDeepLinkEffect } from "@/lib/client/useSectionDeepLink";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BaseCurrencyDisplayProvider>
      <SectionDeepLinkEffect />
      {children}
    </BaseCurrencyDisplayProvider>
  );
}
