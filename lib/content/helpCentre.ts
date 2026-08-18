/**
 * Help Centre content — short, scannable answers for /faq.
 * Categories match the current product architecture (Phase X / X.1).
 */

import {
  unsupportedInvestmentFaq,
  whichInvestmentsSupportedFaq,
} from "@/lib/content/supportedInstrumentsFaq";
import {
  TRUST_EMAIL_PRIVACY,
  TRUST_ESTIMATE_SHORT,
  TRUST_GOALS_ESTIMATE,
  TRUST_NOT_ADVICE_MEDIUM,
} from "@/lib/content/productTrust";
import {
  ANALYSIS_PATH,
  GOALS_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  PERSPECTIVES_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  PORTFOLIO_PATH,
  REVIEW_PATH,
  SETTINGS_PATH,
  UPLOAD_PATH,
} from "@/lib/navigation/appRoutes";

export type HelpCentreLink = {
  href: string;
  label: string;
};

export type HelpCentreQuestion = {
  question: string;
  answer: string;
  link?: HelpCentreLink;
  /** Extra terms for client search (product + user language). */
  keywords?: string[];
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
          "Tobailey is a portfolio intelligence platform for private investors. It helps you understand your portfolio, track progress and stay informed — without broker login or trade execution.",
        keywords: ["monitoring", "intelligence", "overview"],
      },
      {
        question: "Demo vs personal trial",
        answer:
          "Demo is a ready-made, read-only experience with sample holdings. Personal trial is 14 days of Tobailey Complete with your own empty, editable account. After that you can subscribe to Complete or continue with Tobailey Free. Demo data never becomes your personal portfolio.",
        link: { href: "/explore", label: "Explore Demo Portfolio" },
        keywords: ["demo", "trial", "14-day", "example"],
      },
      {
        question: "How do I add holdings manually?",
        answer:
          "Open Portfolio and add an investment, cash or crypto. You can edit symbols, quantities and purchase details anytime.",
        link: { href: PORTFOLIO_PATH, label: "Open Portfolio" },
      },
      {
        question: "How do I import a portfolio?",
        answer:
          "Upload a CSV or Excel broker export. Review matches, then confirm. Nothing is saved until you approve. Tobailey never asks for broker passwords.",
        link: { href: UPLOAD_PATH, label: "Import holdings" },
        keywords: ["csv", "excel", "upload", "broker"],
      },
      {
        question: "How do I add cash?",
        answer:
          "On Portfolio, use Add cash. Cash appears in holdings and feeds Cash intelligence on Analysis.",
        link: { href: PORTFOLIO_PATH, label: "Open Portfolio" },
      },
      whichInvestmentsSupportedFaq,
      unsupportedInvestmentFaq,
    ],
  },
  {
    id: "understand",
    title: "Understand your portfolio",
    questions: [
      {
        question: "What does the Dashboard show?",
        answer:
          "How your portfolio is doing today — value, latest move, holdings and calm links to deeper pages. Detail lives on History, Analysis and Your Review.",
        link: { href: "/dashboard", label: "Open Dashboard" },
      },
      {
        question: "What is Analysis for?",
        answer:
          "Why your portfolio is performing this way — performance, structure, income and exposure when you want more than the Dashboard conclusion.",
        link: { href: ANALYSIS_PATH, label: "Open Analysis" },
      },
      {
        question: "What is Portfolio Scorecard?",
        answer:
          "A calm view of strengths, structure and resilience from available data. It is indicative — not a credit rating or performance prediction.",
        link: { href: PORTFOLIO_HEALTH_PATH, label: "Open Portfolio Scorecard" },
        keywords: ["health", "score", "structure", "resilience"],
      },
      {
        question: "How do Goals work?",
        answer: `Set a target and optional timeline. Tobailey estimates progress from your portfolio and history. ${TRUST_GOALS_ESTIMATE}`,
        link: { href: GOALS_PATH, label: "Open Goals" },
        keywords: ["on track", "target", "progress"],
      },
      {
        question: "What is Portfolio History?",
        answer:
          "How your portfolio developed over time — contributions, withdrawals and development — with Export Portfolio when you want the full workbook.",
        link: { href: PORTFOLIO_HISTORY_PATH, label: "Open Portfolio History" },
      },
      {
        question: "What is Your Review?",
        answer:
          "A short summary of what happened today, this week and this month. Monthly reviews can be saved in the app and optionally downloaded as PDF.",
        link: { href: REVIEW_PATH, label: "Open Your Review" },
        keywords: ["weekly", "monthly", "companion"],
      },
      {
        question: "What is Market Pulse?",
        answer:
          "Available market signals linked to your holdings. The Dashboard shows a compact glance; the full page explores signals in more detail.",
        link: { href: MARKET_PULSE_PATH, label: "Open Market Pulse" },
      },
    ],
  },
  {
    id: "reviews-notifications",
    title: "Reviews and notifications",
    questions: [
      {
        question: "Daily, weekly and monthly reviews",
        answer:
          "Today is compact. Weekly and Monthly are richer summaries using your history, contributions and goals. They summarise — they do not replace Analysis.",
        link: { href: REVIEW_PATH, label: "Open Your Review" },
      },
      {
        question: "Monthly review archive",
        answer:
          "Completed monthly reviews can be saved so history stays stable even if your portfolio changes later.",
        link: { href: `${REVIEW_PATH}?period=monthly`, label: "Open Monthly Review" },
      },
      {
        question: "Review emails",
        answer:
          "Complete users can opt in to a weekly or monthly personal investment review email. Both are off by default. Demo accounts are never emailed.",
        link: { href: `${SETTINGS_PATH}#reports-email`, label: "Email preferences" },
        keywords: ["notification", "opt-in", "monthly_review_email", "weekly_review_email"],
      },
      {
        question: "Email privacy",
        answer: TRUST_EMAIL_PRIVACY,
        keywords: ["values", "holdings", "privacy"],
      },
      {
        question: "PDF review",
        answer:
          "Optional PDF download for weekly and monthly reviews in Tobailey. Emails link to that download and do not attach a PDF.",
      },
    ],
  },
  {
    id: "your-data",
    title: "Your data",
    questions: [
      {
        question: "Export Portfolio",
        answer:
          "One click downloads one Excel workbook with organised sheets for holdings, contributions, history and more when available.",
        keywords: ["excel", "workbook", "download"],
      },
      {
        question: "What does the Excel workbook contain?",
        answer:
          "Holdings, contributions and timeline summaries, plus a Portfolio Review sheet when a saved monthly review exists. Existing sheets stay intact.",
      },
      {
        question: "Contributions and withdrawals",
        answer:
          "Record activity in Portfolio History. Net contributions are kept separate from investment return.",
        link: { href: PORTFOLIO_HISTORY_PATH, label: "Open Portfolio History" },
      },
      {
        question: "Currencies and conversion",
        answer:
          "Choose a portfolio base currency in Settings. Values convert for display; your broker remains the source of truth for execution.",
        link: { href: SETTINGS_PATH, label: "Open Settings" },
      },
      {
        question: "Data ownership",
        answer:
          "Your portfolio data is always yours. Export it anytime. Contact support to request account deletion where needed.",
        link: { href: "/contact", label: "Contact support" },
      },
    ],
  },
  {
    id: "market-data",
    title: "Market data",
    questions: [
      {
        question: "Live vs delayed data",
        answer:
          "Some prices are live, others delayed or previous-close. Tobailey labels freshness instead of pretending every quote is live.",
        keywords: ["stale", "fresh", "eodhd"],
      },
      {
        question: "Previous market close",
        answer:
          "The last official exchange close used when a live session price is not available.",
      },
      {
        question: "Crypto pricing differences",
        answer:
          "Crypto venues and update times can differ from brokers. Treat displayed crypto values as monitoring estimates.",
      },
      {
        question: "Refresh behaviour",
        answer:
          "Refresh from Dashboard or Portfolio. Refresh is rate-limited; cached values stay visible if a refresh cannot complete.",
      },
      {
        question: "Third-party sources",
        answer:
          "Market prices and news come from third-party providers and may be incomplete or unavailable.",
      },
    ],
  },
  {
    id: "account-access",
    title: "Account and access",
    questions: [
      {
        question: "Demo access",
        answer:
          "Demo lets you explore with sample data. It is read-oriented and clearly marked so it never mixes with a personal portfolio.",
      },
      {
        question: "Personal trial",
        answer:
          "A 14-day Complete trial of your own account. Starts empty — add or import holdings yourself. After 14 days you can subscribe to Tobailey Complete (€5.99/month) or continue with Tobailey Free.",
        link: { href: "/signup?intent=trial", label: "Start 14-day trial" },
      },
      {
        question: "Subscription and expired access",
        answer:
          "Tobailey has two plans: Free (€0) and Complete (€5.99/month). New eligible users start with a 14-day Complete trial, then subscribe to Complete or continue with Free. There are no ads. Automatic checkout is not live yet.",
        link: { href: "/pricing", label: "View pricing" },
      },
      {
        question: "Settings and email preferences",
        answer:
          "Manage base currency, reports and monthly review email opt-in in Settings. Preference saving does not require email delivery to be live yet.",
        link: { href: SETTINGS_PATH, label: "Open Settings" },
      },
    ],
  },
  {
    id: "news-perspectives",
    title: "News and Perspectives",
    questions: [
      {
        question: "What does News show?",
        answer:
          "Markets Today and stories relevant to your holdings. Context only — not trading instructions.",
        link: { href: NEWS_PATH, label: "Open News" },
      },
      {
        question: "What are Perspectives?",
        answer:
          "Curated viewpoints on macro, investing and technology. Optional context, not advice.",
        link: { href: PERSPECTIVES_PATH, label: "Open Perspectives" },
      },
      {
        question: "What are Ideas?",
        answer:
          "Themes and opportunities tailored to your portfolio when holdings are available.",
        link: { href: "/discover", label: "Open Ideas" },
        keywords: ["discover"],
      },
    ],
  },
  {
    id: "safety",
    title: "Safety and limitations",
    questions: [
      {
        question: "Does Tobailey give financial advice?",
        answer: TRUST_NOT_ADVICE_MEDIUM,
        keywords: ["advice", "adviser", "advisor", "recommendation"],
      },
      {
        question: "Are estimates and projections guaranteed?",
        answer: `No. ${TRUST_ESTIMATE_SHORT} Goals, scores and projections use your inputs and available history and may be inaccurate.`,
        keywords: ["guaranteed", "projection", "expected return"],
      },
      {
        question: "Data accuracy",
        answer:
          "Prices, FX and news may be delayed or incomplete. Always verify critical figures with your broker before acting.",
      },
      {
        question: "User responsibility",
        answer:
          "You decide what to do with the information. Seek a qualified professional when you need personal advice.",
      },
      {
        question: "Will Tobailey execute trades?",
        answer:
          "No. Tobailey is not a broker and never places, changes or cancels orders.",
      },
    ],
  },
  {
    id: "glossary",
    title: "Glossary",
    questions: [
      {
        question: "Portfolio value",
        answer:
          "The sum of valued holdings in your portfolio base currency, using available prices.",
      },
      {
        question: "Investment return",
        answer:
          "Change in portfolio value after accounting for contributions and withdrawals where data allows.",
      },
      {
        question: "Net contributions",
        answer:
          "Money you added minus money you withdrew — separate from investment return.",
      },
      {
        question: "Concentration",
        answer:
          "How much of the portfolio sits in a few positions.",
      },
      {
        question: "Daily / Weekly Pulse",
        answer:
          "Compact period scores on the Dashboard that summarise available daily and weekly signals. They are not financial advice.",
      },
      {
        question: "Portfolio Scorecard",
        answer:
          "Structural scores for concentration, diversification and related resilience signals from available data.",
      },
      {
        question: "Previous close",
        answer:
          "The last official exchange close used when a live session price is not available.",
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    questions: [
      {
        question: "Important information",
        answer: `${TRUST_NOT_ADVICE_MEDIUM} Always verify critical figures with your broker and a qualified professional where needed.`,
      },
      {
        question: "Market data disclaimer",
        answer:
          "Prices and news may be delayed, incomplete or unavailable. Displayed values are for monitoring and education, not for order placement.",
      },
    ],
  },
];

export function flattenHelpCentreQuestions(): Array<
  HelpCentreQuestion & { sectionId: string; sectionTitle: string }
> {
  return HELP_CENTRE_SECTIONS.flatMap((section) =>
    section.questions.map((question) => ({
      ...question,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  );
}

export function searchHelpCentre(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return HELP_CENTRE_SECTIONS;

  return HELP_CENTRE_SECTIONS.map((section) => ({
    ...section,
    questions: section.questions.filter((item) => {
      const haystack = [
        item.question,
        item.answer,
        ...(item.keywords ?? []),
        section.title,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    }),
  })).filter((section) => section.questions.length > 0);
}
