import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CircleHelp,
  Database,
  LockKeyhole,
  Mail,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

const faqSections = [
  {
    title: "About Investment OS",
    icon: Sparkles,
    questions: [
      {
        question: "What is Investment OS?",
        answer:
          "Investment OS is a portfolio-monitoring and decision-support platform for private investors. It brings portfolio information, market context, holding analysis and financial goals together in one organised system.",
      },
      {
        question: "Who is Investment OS designed for?",
        answer:
          "Investment OS is designed primarily for private investors who want a clearer overview of their portfolio and a more structured way to monitor risks, opportunities and long-term progress.",
      },
      {
        question: "Does Investment OS provide financial advice?",
        answer:
          "No. Investment OS is an informational, analytical and decision-support tool. It does not provide regulated personal financial advice, investment recommendations or guarantees about future performance.",
      },
    ],
  },
  {
    title: "Portfolio and uploads",
    icon: BriefcaseBusiness,
    questions: [
      {
        question: "How do I add my portfolio?",
        answer:
          "During the beta, you can upload a screenshot of your portfolio. Investment OS attempts to recognise the holdings, quantities and purchase information. You review the recognised positions before they are added.",
      },
      {
        question: "Which brokers are supported?",
        answer:
          "The initial beta focuses on common European broker layouts, including DEGIRO-style screenshots. Support for additional brokers and direct portfolio imports will be expanded gradually.",
      },
      {
        question: "Can I edit recognised holdings?",
        answer:
          "Yes. The review step is intended to let you correct symbols, quantities, average purchase prices and other details before your portfolio is saved.",
      },
      {
        question: "Which asset classes can be monitored?",
        answer:
          "The current product focuses on listed shares, ETFs, ETCs, ETPs and selected digital-asset products. Broader asset support may be added later.",
      },
    ],
  },
  {
    title: "Market data and briefing",
    icon: Newspaper,
    questions: [
      {
        question: "How often are market prices updated?",
        answer:
          "Update frequency depends on the market-data provider, exchange and subscription level. Investment OS indicates whether a displayed price is live, cached or based on fallback portfolio information.",
      },
      {
        question: "Why can Investment OS differ from my broker?",
        answer:
          "Small differences can occur because providers may use different exchanges, update times, currency-conversion rates or delayed market feeds. Your broker remains the authoritative source for execution and account value.",
      },
      {
        question: "What is included in the portfolio briefing?",
        answer:
          "The briefing combines macroeconomic developments, important market events and news connected to your holdings. It also explains which positions may be affected and why.",
      },
      {
        question: "Is all news automatically reliable?",
        answer:
          "No automated news system is perfect. Articles, sentiment classifications and portfolio-impact assessments should be reviewed critically and should not be treated as investment instructions.",
      },
    ],
  },
  {
    title: "Goals and analysis",
    icon: BarChart3,
    questions: [
      {
        question: "How does the goal engine work?",
        answer:
          "The goal engine uses your current portfolio value, target value, target year and expected contributions to estimate the average annual return required to reach your goal.",
      },
      {
        question: "Are projections guaranteed?",
        answer:
          "No. Projections are mathematical scenarios based on assumptions. Actual investment returns, inflation, taxes, fees and personal circumstances can differ substantially.",
      },
      {
        question: "What is the portfolio health score?",
        answer:
          "The portfolio health score is an indicative Investment OS metric based on factors such as concentration, diversification and the return required to achieve your selected goal. It is not a credit rating or professional suitability assessment.",
      },
    ],
  },
  {
    title: "Accounts, privacy and security",
    icon: LockKeyhole,
    questions: [
      {
        question: "Is my portfolio stored securely?",
        answer:
          "Secure user authentication and database storage are being implemented before the public beta. The development version may still use local browser storage for certain information and should not be treated as a production environment.",
      },
      {
        question: "Does Investment OS need access to my broker account?",
        answer:
          "No. The current workflow does not require your broker password or trading access. Never share broker login credentials with Investment OS.",
      },
      {
        question: "Will Investment OS execute trades?",
        answer:
          "No. Investment OS is not a broker and does not place, modify or cancel investment orders.",
      },
      {
        question: "Can I delete my account and portfolio data?",
        answer:
          "Account and data-deletion controls will be included before public access. The final privacy policy will explain how deletion requests and retention periods are handled.",
      },
    ],
  },
  {
    title: "Plans and beta access",
    icon: Database,
    questions: [
      {
        question: "Is Investment OS currently free?",
        answer:
          "The private testing version is currently free. Pricing for future public access will be communicated before paid subscriptions are enabled.",
      },
      {
        question: "What will be included in a paid plan?",
        answer:
          "The intended paid experience includes secure accounts, portfolio storage, market-data updates, personalised briefing content, holding analysis and goal monitoring. Final features and pricing have not yet been confirmed.",
      },
      {
        question: "Can I cancel a future subscription?",
        answer:
          "The intention is to offer subscriptions that can be cancelled through the user account. Exact billing and cancellation terms will be published before payments are accepted.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black tracking-[-0.02em]">
                Investment OS
              </p>

              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Complete investment system
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-200/40 via-violet-200/30 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
            <CircleHelp className="h-7 w-7" />
          </div>

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Frequently asked questions
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-6xl">
            Everything you need to know
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Learn how Investment OS handles portfolios, market data,
            goals, privacy and the upcoming beta.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl space-y-12">
          {faqSections.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.title}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="text-2xl font-black tracking-[-0.03em]">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.questions.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition open:shadow-md"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-950">
                        <span>{item.question}</span>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition group-open:rotate-45 group-open:bg-slate-950 group-open:text-white">
                          +
                        </span>
                      </summary>

                      <p className="mt-5 max-w-4xl border-t border-slate-100 pt-5 text-sm leading-7 text-slate-600">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          <article className="rounded-[28px] bg-slate-950 p-7 text-white shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Important information
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              Investment OS is a decision-support and portfolio-monitoring
              tool. It does not provide personal financial advice and cannot
              guarantee investment results.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Mail className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Still have a question?
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Contact the Investment OS team about beta access, support,
              partnerships or product feedback.
            </p>

            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
            >
              Contact us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} Investment OS. All rights reserved.
          </p>

          <nav className="flex flex-wrap gap-5 text-xs font-bold text-slate-600">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}