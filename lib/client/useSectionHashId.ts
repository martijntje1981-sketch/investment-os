"use client";

import { useSyncExternalStore } from "react";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import {
  getSectionHash,
  getServerSectionHash,
  subscribeSectionHash,
} from "@/lib/client/sectionHashNavigation";

export const PORTFOLIO_MONEY_IN_OUT_HASH = "money-in-out";

export function useSectionHashId(): string | null {
  const hash = useSyncExternalStore(
    subscribeSectionHash,
    getSectionHash,
    getServerSectionHash,
  );
  return parseSectionHash(hash);
}

export function usePortfolioMoneyInOutOpen(): boolean {
  return useSectionHashId() === PORTFOLIO_MONEY_IN_OUT_HASH;
}
