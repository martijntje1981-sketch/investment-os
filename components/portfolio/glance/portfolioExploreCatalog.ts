import {
  BarChart3,
  Download,
  FileSpreadsheet,
  History,
  Landmark,
  PieChart,
  Upload,
  Wallet,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ANALYSIS_PATH,
  MARKET_PULSE_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  UPLOAD_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export const PORTFOLIO_MONEY_IN_OUT_HREF = "/portfolio#money-in-out";

export const PORTFOLIO_EXPLORE_DESTINATIONS = {
  history: PORTFOLIO_HISTORY_PATH,
  allocation: DASHBOARD_DEEP_LINKS.portfolioExposure,
  analysis: ANALYSIS_PATH,
  reports: REVIEW_PATH,
  moneyInOut: PORTFOLIO_MONEY_IN_OUT_HREF,
  scorecard: PORTFOLIO_HEALTH_PATH,
  import: UPLOAD_PATH,
  marketPulse: MARKET_PULSE_PATH,
} as const;

export type PortfolioExploreItem = {
  href: string;
  title: string;
  explanation: string;
  icon: LucideIcon;
};

export type PortfolioExploreGroup = {
  label: string;
  items: readonly PortfolioExploreItem[];
};

export const PORTFOLIO_EXPLORE_GROUPS: readonly PortfolioExploreGroup[] = [
  {
    label: "Manage",
    items: [
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.moneyInOut,
        title: "Money in & out",
        explanation: "Deposits and withdrawals",
        icon: Wallet,
      },
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.import,
        title: "Import",
        explanation: "CSV or Excel file",
        icon: Upload,
      },
    ],
  },
  {
    label: "Understand",
    items: [
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.history,
        title: "Portfolio History",
        explanation: "Full recorded history",
        icon: History,
      },
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.allocation,
        title: "Allocation",
        explanation: "Mix and weights",
        icon: PieChart,
      },
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.analysis,
        title: "Analysis",
        explanation: "Position, risk, outlook",
        icon: BarChart3,
      },
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.scorecard,
        title: "Scorecard",
        explanation: "Portfolio health",
        icon: Landmark,
      },
    ],
  },
  {
    label: "More",
    items: [
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.reports,
        title: "Reports",
        explanation: "Weekly and monthly review",
        icon: FileSpreadsheet,
      },
      {
        href: PORTFOLIO_EXPLORE_DESTINATIONS.marketPulse,
        title: "Market Pulse",
        explanation: "Markets linked to holdings",
        icon: Waves,
      },
    ],
  },
] as const;

export const PORTFOLIO_EXPLORE_MOBILE_COMPACT_TITLES = [
  "Money in & out",
  "Portfolio History",
  "Allocation",
  "Import",
] as const;

export const PORTFOLIO_EXPLORE_EXPORT_TITLE = "Export";

export { Download as PortfolioExploreExportIcon };
