/**
 * First-time portfolio setup detection and verified import messaging.
 *
 * Holdings presence comes from useUserPortfolio (local cache hydrated from
 * Supabase). A lightweight user-scoped marker softens copy after the user
 * previously completed setup and later cleared all holdings.
 */

import { isValidUserSub } from "@/lib/client/portfolioStorageKeys";

/**
 * Tertiary link to the public Demo Portfolio showroom (/explore).
 * Does not seed or alter the Personal Trial account.
 */
export const DEMO_PORTFOLIO_ENABLED = true;

export const DEMO_PORTFOLIO_HREF = "/explore";

export const PORTFOLIO_SETUP_ROUTES = {
  import: "/upload",
  manualAdd: "/portfolio?add=investment",
  portfolio: "/portfolio",
} as const;

/** Verified against ImportMethodPicker + spreadsheetParser — do not invent formats. */
export const SUPPORTED_PORTFOLIO_INPUT_METHODS = [
  {
    id: "csv-excel",
    label: "CSV or Excel",
    detail: "Upload .csv, .xlsx or .xls exports",
  },
  {
    id: "manual",
    label: "Manual entry",
    detail: "Add investments and crypto yourself",
  },
  {
    id: "cash",
    label: "Cash positions",
    detail: "Record cash balances by currency",
  },
] as const;

export const PORTFOLIO_SETUP_STEPS = [
  {
    step: 1,
    title: "Choose your file",
  },
  {
    step: 2,
    title: "Review detected holdings",
  },
  {
    step: 3,
    title: "Import complete",
  },
] as const;

export const PORTFOLIO_SETUP_COPY = {
  welcomeEyebrow: "7-day Personal Trial",
  returningEyebrow: "Portfolio empty",
  headline: "Your portfolio is ready.",
  returningHeadline: "Add holdings to continue",
  supporting:
    "Import your holdings or add them manually. You can change everything later.",
  returningSupporting:
    "Import a CSV or Excel file, or add holdings manually, to restore your Dashboard.",
  importPrimary: "Import my portfolio",
  importHint: "Upload a broker export · you review before anything is added",
  manualSecondary: "Add holdings manually",
  demoTertiary: "Explore the Demo Portfolio",
  compactTitle: "Set up your portfolio",
  compactBody:
    "Import a CSV or Excel file, or add holdings manually.",
} as const;

export function portfolioSetupCompletedKey(userSub: string): string {
  return `investment-os-portfolio-setup-completed:${userSub}`;
}

export function readPortfolioSetupCompleted(userSub: string | null | undefined): boolean {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(portfolioSetupCompletedKey(userSub)) === "1";
  } catch {
    return false;
  }
}

export function markPortfolioSetupCompleted(userSub: string | null | undefined): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(portfolioSetupCompletedKey(userSub), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export type PortfolioSetupGateInput = {
  authenticated: boolean;
  holdingsCount: number;
  portfolioReady: boolean;
  /** When sync is still loading remote state, wait before showing empty onboarding. */
  syncLoading?: boolean;
};

/**
 * Show first-time / empty portfolio setup when the authenticated user has no
 * holdings after portfolio state is ready. Supabase-backed holdings (via
 * useUserPortfolio hydrate) are the source of truth — not localStorage alone.
 */
export function needsPortfolioSetup(input: PortfolioSetupGateInput): boolean {
  if (!input.authenticated) return false;
  if (!input.portfolioReady) return false;
  if (input.syncLoading) return false;
  return input.holdingsCount === 0;
}

export function resolvePortfolioSetupVariant(
  userSub: string | null | undefined,
): "first-time" | "returning-empty" {
  return readPortfolioSetupCompleted(userSub) ? "returning-empty" : "first-time";
}
