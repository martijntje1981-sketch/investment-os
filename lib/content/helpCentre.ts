/**
 * Help Centre content — short, scannable answers for /faq.
 * Keep entries easy to scan; avoid walls of text.
 */

import {
  unsupportedInvestmentFaq,
  whichInvestmentsSupportedFaq,
} from "@/lib/content/supportedInstrumentsFaq";
import { SUPPORTED_INSTRUMENTS_PATH } from "@/lib/content/supportedInstrumentsContent";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  PORTFOLIO_PATH,
} from "@/lib/navigation/appRoutes";

const NEWS_PATH = "/news";
const PERSPECTIVES_PATH = "/perspectives";
const UPLOAD_PATH = "/upload";

export type HelpCentreLink = {
  href: string;
  label: string;
};

export type HelpCentreQuestion = {
  question: string;
  answer: string;
  link?: HelpCentreLink;
};

export type HelpCentreSection = {
  id: string;
  title: string;
  questions: HelpCentreQuestion[];
};

export const HELP_CENTRE_SECTIONS: HelpCentreSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    questions: [
      {
        question: "What is Tobailey?",
        answer:
          "Tobailey is a portfolio monitoring app for private investors. It brings holdings, market context, goals and analysis together so you can see the conclusion first — and open detail only when you want it.",
      },
      {
        question: "Who is Tobailey for?",
        answer:
          "Private investors who want a calm overview of their portfolio, progress toward goals, and clearer market context — without broker login or trade execution.",
      },
      {
        question: "Does Tobailey give financial advice?",
        answer:
          "No. Tobailey is informational and analytical only. It does not provide regulated personal advice, buy or sell recommendations, or performance guarantees.",
      },
      {
        question: "Where should I start after signing in?",
        answer:
          "Open the Dashboard. It shows your portfolio value, what changed, and anything worth noticing today. From there you can open Holdings, Goals, History or Analysis when you need more detail.",
        link: { href: "/dashboard", label: "Open Dashboard" },
      },
    ],
  },
  {
    id: "holdings",
    title: "Adding holdings",
    questions: [
      {
        question: "How do I add holdings?",
        answer:
          "Add investments manually on Portfolio, or import a CSV or Excel file. You review matches before anything is saved.",
        link: { href: PORTFOLIO_PATH, label: "Open Portfolio" },
      },
      {
        question: "Which brokers are supported?",
        answer:
          "Tobailey is broker-independent. You never connect a broker login. Import a file or enter holdings yourself.",
      },
      {
        question: "Can I edit holdings after import?",
        answer:
          "Yes. Review and correct symbols, quantities and purchase details before saving — and edit any holding later from Portfolio.",
      },
      {
        question: "Which asset classes can I monitor?",
        answer:
          "Listed shares, ETFs, ETCs, ETPs and selected digital assets. Broader support may grow over time.",
      },
      whichInvestmentsSupportedFaq,
      unsupportedInvestmentFaq,
    ],
  },
  {
    id: "import",
    title: "Import portfolio",
    questions: [
      {
        question: "How does import work?",
        answer:
          "Upload a CSV or Excel broker export. Tobailey detects holdings, you review matches, then import. Nothing is added until you confirm.",
        link: { href: UPLOAD_PATH, label: "Import portfolio" },
      },
      {
        question: "What files can I upload?",
        answer:
          "CSV and Excel (.csv, .xlsx, .xls). Export a positions or portfolio overview from your broker — Tobailey never asks for broker login.",
      },
      {
        question: "What if a holding needs review?",
        answer:
          "Uncertain matches stay out until you confirm the instrument, exclude the row, or add it manually.",
      },
      {
        question: "What about duplicates?",
        answer:
          "Holdings that already match by provider symbol, ISIN or ticker+exchange are skipped on merge — never silently doubled.",
      },
      {
        question: "Where can I see supported instruments?",
        answer:
          "The supported instruments list explains what Tobailey can price and classify today.",
        link: {
          href: SUPPORTED_INSTRUMENTS_PATH,
          label: "View supported instruments",
        },
      },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    questions: [
      {
        question: "How do Goals work?",
        answer:
          "Set a target amount, optional target year and optional monthly contribution. Tobailey estimates progress and completion from your portfolio and history — you do not need to calculate anything.",
        link: { href: GOALS_PATH, label: "Open Goals" },
      },
      {
        question: "Are goal estimates guaranteed?",
        answer:
          "No. Completion dates and pace are estimates from available history and your plan. Markets, fees and contributions can change the outcome.",
      },
      {
        question: "What inputs do I need?",
        answer:
          "Goal name, target amount, and usually a target year. Monthly contribution is optional. Expected return stays a calm default unless you change it elsewhere.",
      },
    ],
  },
  {
    id: "history-export",
    title: "Portfolio History & export",
    questions: [
      {
        question: "What is Portfolio History?",
        answer:
          "A calm record of portfolio development, contributions and withdrawals — with a shared timeline used across Dashboard, Goals and History.",
        link: { href: PORTFOLIO_HISTORY_PATH, label: "Open Portfolio History" },
      },
      {
        question: "How do I export my portfolio?",
        answer:
          "Use Export Portfolio on Dashboard, History or Goals. One workbook covers holdings, contributions, timeline summary and goals when available.",
      },
      {
        question: "Why does History say insufficient data?",
        answer:
          "Some estimates need enough contribution or performance history. Tobailey says so clearly instead of inventing a series.",
      },
    ],
  },
  {
    id: "health-analysis",
    title: "Portfolio Health & Analysis",
    questions: [
      {
        question: "What is Portfolio Health?",
        answer:
          "A scorecard for structure and resilience — concentration, diversification and goal readiness. It is indicative, not a credit rating.",
        link: { href: PORTFOLIO_HEALTH_PATH, label: "Open Portfolio Health" },
      },
      {
        question: "What is Analysis for?",
        answer:
          "Deep-dive detail: performance, exposure, income and structure. Use it when you want more than the Dashboard conclusion.",
        link: { href: ANALYSIS_PATH, label: "Open Analysis" },
      },
      {
        question: "How is Analysis different from the Dashboard?",
        answer:
          "Dashboard shows what matters now. Analysis reveals supporting detail when you ask for it.",
      },
    ],
  },
  {
    id: "news-perspectives",
    title: "News & Perspectives",
    questions: [
      {
        question: "What does News show?",
        answer:
          "Market briefing and stories relevant to your holdings. It is context — not trading instructions.",
        link: { href: NEWS_PATH, label: "Open News" },
      },
      {
        question: "What are Perspectives?",
        answer:
          "Curated creator viewpoints on macro, investing, bitcoin and technology. Use them as optional context, not advice.",
        link: { href: PERSPECTIVES_PATH, label: "Open Perspectives" },
      },
      {
        question: "Is news always reliable?",
        answer:
          "No automated feed is perfect. Read critically and never treat headlines as buy or sell instructions.",
      },
    ],
  },
  {
    id: "demo-trial",
    title: "Demo vs personal trial",
    questions: [
      {
        question: "What is the Demo Portfolio?",
        answer:
          "A ready-made, read-only example so you can explore Tobailey. It uses sample holdings only and does not become your personal portfolio.",
        link: { href: "/explore", label: "Explore Demo Portfolio" },
      },
      {
        question: "What is the 7-day Personal Trial?",
        answer:
          "Your own editable account. It starts empty — no demo holdings, cash, goals or contribution history. Import or add holdings yourself.",
        link: { href: "/signup?intent=trial", label: "Start 7-day Personal Trial" },
      },
      {
        question: "Can Demo and Personal Trial mix?",
        answer:
          "No. Demo data stays in the demo experience. A Personal Trial never receives demo seeding.",
      },
    ],
  },
  {
    id: "currencies-prices",
    title: "Currencies & prices",
    questions: [
      {
        question: "How do base currencies work?",
        answer:
          "Choose a portfolio base currency in Settings. Values convert for display; your broker remains the source of truth for execution.",
        link: { href: "/settings", label: "Open Settings" },
      },
      {
        question: "Why can Tobailey differ from my broker?",
        answer:
          "Exchanges, update times, FX rates and delayed feeds can differ. Your broker is authoritative for account value and trades.",
      },
      {
        question: "What does delayed market data mean?",
        answer:
          "Some prices reflect a previous close or delayed feed. Tobailey labels previous-close and stale quotes instead of pretending they are live.",
      },
      {
        question: "How does refresh work?",
        answer:
          "You can refresh prices from Dashboard or Portfolio. Refresh is rate-limited so the app stays calm and respects provider limits. Cached values remain visible if a refresh cannot complete.",
      },
    ],
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    questions: [
      {
        question: "Will Tobailey execute trades?",
        answer:
          "No. Tobailey is not a broker and never places, changes or cancels orders.",
      },
      {
        question: "Does Tobailey need my broker password?",
        answer:
          "No. Never share broker credentials with Tobailey.",
      },
      {
        question: "Can I delete my account?",
        answer:
          "Yes. Contact Support to request deletion. Limited records may be retained where legally required.",
        link: { href: "/contact", label: "Contact support" },
      },
      {
        question: "How much does Tobailey cost?",
        answer:
          "Pricing and trial terms are shown before checkout. Cancel before renewal to stop future billing.",
        link: { href: "/pricing", label: "View pricing" },
      },
    ],
  },
  {
    id: "glossary",
    title: "Glossary",
    questions: [
      {
        question: "What is concentration?",
        answer:
          "How much of the portfolio sits in a few positions. Higher concentration means a larger share in one or a few holdings.",
      },
      {
        question: "What is net contributions?",
        answer:
          "Money you added minus money you withdrew. It is separate from investment return.",
      },
      {
        question: "What is previous close?",
        answer:
          "The last official exchange close used when a live session price is not available.",
      },
      {
        question: "What is Portfolio Timeline?",
        answer:
          "The shared history foundation used by Dashboard, Goals and Portfolio History so progress stays consistent.",
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    questions: [
      {
        question: "Important information",
        answer:
          "Tobailey is a decision-support and portfolio-monitoring tool. It does not provide personal financial advice and cannot guarantee investment results. Always verify critical figures with your broker and professional advisers where needed.",
      },
      {
        question: "Market data disclaimer",
        answer:
          "Prices and news may be delayed, incomplete or unavailable. Displayed values are for monitoring and education, not for order placement.",
      },
    ],
  },
];
