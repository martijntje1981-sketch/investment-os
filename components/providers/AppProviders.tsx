"use client";

import { BaseCurrencyDisplayProvider } from "@/lib/client/baseCurrencyDisplay";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <BaseCurrencyDisplayProvider>{children}</BaseCurrencyDisplayProvider>;
}
