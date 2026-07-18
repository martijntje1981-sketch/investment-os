import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileUp,
  Gauge,
  Goal,
  Layers3,
  LockKeyhole,
  Mail,
  Newspaper,
  PieChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";

import MarketingHeader from "@/components/marketing/MarketingHeader";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    icon: BriefcaseBusiness,
    title: "One complete portfolio overview",
    description:
      "Track holdings, allocation, purchase prices, market value and total returns from one clear dashboard.",
  },
  {
    icon: Newspaper,
    title: "Portfolio analysis powered by AI",
    description:
      "Receive personalised analysis, market context, analyst consensus and portfolio insights based on your holdings.",
  },
  {
    icon: Target,
    title: "Turn investing into a measurable plan",
    description:
      "Define a financial goal, test contribution scenarios and monitor the return required to stay on track.",
  },
  {
    icon: BrainCircuit,
    title: "Investment intelligence, not noise",
    description:
      "Translate market information into clear portfolio impact, risks and decision-support insights.",
  },
  {
    icon: PieChart,
    title: "Understand concentration and balance",
    description:
      "Monitor portfolio weights, diversification and the positions driving most of your risk.",
  },
  {
    icon: FileUp,
    title: "Update your portfolio quickly",
    description:
      "Upload a broker screenshot and review the recognised holdings before updating your Investment OS.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Upload your portfolio",
    description:
      "Start with a portfolio screenshot and review the detected positions before saving them.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Connect your financial goal",
    description:
      "Set a target value, target year and expected annual contributions.",
    icon: Goal,
  },
  {
    number: "03",
    title: "Monitor what matters",
    description:
      "Review your dashboard, AI analysis and portfolio insights every day.",
    icon: Gauge,
  },
];

const benefits = [
  "Portfolio overview and allocation monitoring",
  "Holding-level performance and risk analysis",
  "AI-powered portfolio analysis and market intelligence",
  "Goal tracking and scenario calculations",
  "Portfolio upload and review workflow",
  "Clear decision-support insights",
];

const faqItems = [
  {
    question:
      "Does Investment OS provide financial advice?",
    answer:
      "No. Investment OS is a monitoring and decision-support tool. It organises portfolio information, market context and scenarios, but it does not provide regulated personal financial advice.",
  },
  {
    question:
      "How does Investment OS receive my portfolio?",
    answer:
      "Investment OS supports portfolio screenshot uploads followed by a review step. You remain in control of which recognised holdings are accepted.",
  },
  {
    question:
      "Are market prices always real time?",
    answer:
      "Market-data availability and update frequency depend on the selected data provider, exchange and subscription level. The product clearly shows whether data is live, cached or using a fallback price.",
  },
  {
    question:
      "Can I use Investment OS with any broker?",
    answer:
      "Yes. Investment OS is independent and supports portfolio information from multiple brokers through screenshots, CSV or Excel imports and manual entry.",
  },
  {
    question:
      "Is my portfolio stored securely?",
    answer:
      "Investment OS uses appropriate technical and organisational safeguards to protect account and portfolio information. You remain in control of the information you upload.",
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Built for clarity",
    description:
      "Understand what is happening without navigating multiple disconnected tools.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy first",
    description:
      "Your portfolio information is handled with privacy and security as core product requirements.",
  },
  {
    icon: Layers3,
    title: "One source of truth",
    description:
      "Dashboard, portfolio, holdings and analysis use the same central portfolio information.",
  },
];

export default async function MarketingHomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user && view !== "home") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
          <div className="absolute left-1/2 top-0 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-200/45 via-violet-200/30 to-transparent blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                <Sparkles className="h-4 w-4" />
                Portfolio intelligence in one system
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-7xl">
                Take control of your
                <span className="block bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  investment journey
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Investment OS brings your portfolio,
                market context and long-term financial
                goal together in one clear control
                centre.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Start with your portfolio
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Explore the dashboard
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <TrustPoint text="No financial advice" />
                <TrustPoint text="Portfolio-first intelligence" />
                <TrustPoint text="Built for private investors" />
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 sm:p-6">
                <div className="overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white sm:p-8">
                  <div className="mb-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">
                      Illustrative product preview
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Fixed example data — this is not your portfolio and does not change with your account.
                    </p>
                  </div>

                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Investment control centre
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.05em]">
                        €100,000
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        Example portfolio value
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <PreviewMetric
                      label="Goal progress"
                      value="10.0%"
                    />

                    <PreviewMetric
                      label="Portfolio health"
                      value="70/100"
                    />

                    <PreviewMetric
                      label="Active holdings"
                      value="8"
                    />

                    <PreviewMetric
                      label="Main risk"
                      value="Concentration"
                    />
                  </div>

                  <div className="mt-6 rounded-2xl bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          Example goal
                        </p>

                        <p className="mt-2 text-xl font-bold">
                          €1,000,000 target
                        </p>
                      </div>

                      <Goal className="h-7 w-7 text-violet-300" />
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[10%] rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <MiniPreviewCard
                    icon={BriefcaseBusiness}
                    title="Portfolio"
                    text="Holdings and allocation"
                  />

                  <MiniPreviewCard
                    icon={Newspaper}
                    title="Analysis"
                    text="AI insights & market intelligence"
                  />

                  <MiniPreviewCard
                    icon={Target}
                    title="Goals"
                    text="Track long-term progress"
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BellRing className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Daily intelligence
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      Today's portfolio analysis is ready
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="One investment system"
              title="Everything you need to understand your portfolio"
              description="Replace scattered spreadsheets, generic market news and disconnected goal calculations with one organised investment workspace."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article
                    key={feature.title}
                    className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="mt-6 text-xl font-bold tracking-[-0.02em]">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 bg-slate-950 px-5 py-20 text-white sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                  How it works
                </p>

                <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  From portfolio screenshot to daily
                  decision support
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Investment OS is designed to remove
                  friction. Start with what you already
                  have and build a clearer investment
                  process around it.
                </p>
              </div>

              <div className="grid gap-5">
                {workflowSteps.map((step) => {
                  const Icon = step.icon;

                  return (
                    <article
                      key={step.number}
                      className="grid gap-5 rounded-[28px] border border-white/10 bg-white/5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                    >
                      <span className="text-sm font-black text-blue-300">
                        {step.number}
                      </span>

                      <div>
                        <h3 className="text-xl font-bold">
                          {step.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {step.description}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <Icon className="h-6 w-6" />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[32px] bg-gradient-to-br from-blue-600 to-violet-700 p-8 text-white shadow-xl sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Newspaper className="h-7 w-7" />
              </div>

              <p className="mt-7 text-sm font-bold uppercase tracking-[0.16em] text-blue-100">
                AI Portfolio Analysis
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Understand what today's market means for
                your portfolio
              </h2>

              <p className="mt-5 leading-8 text-blue-100">
                AI combines macro developments, analyst consensus,
                company news and portfolio exposure into one
                clear daily analysis.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <BriefingPoint text="Executive Summary" />
                <BriefingPoint text="Portfolio Risks" />
                <BriefingPoint text="Analyst Consensus" />
                <BriefingPoint text="AI Recommendations" />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
                Built around your portfolio
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Actionable investment intelligence.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Generic financial news leaves the most
                important question unanswered: what does
                this mean for your investments?
              </p>

              <div className="mt-8 space-y-4">
                <BenefitRow text="Focus on developments connected to your holdings" />
                <BenefitRow text="Separate short-term volatility from thesis-changing news" />
                <BenefitRow text="See which positions are most affected" />
                <BenefitRow text="Keep your long-term goal visible during market moves" />
              </div>

              <Link
                href="/briefing"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-violet-700"
              >
                Preview portfolio analysis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Simple pricing"
              title="One plan. Your complete Investment OS."
              description="Monitor your portfolio, understand what is moving it and stay focused on your long-term financial goal."
            />

            <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
              <div className="bg-slate-950 p-8 text-white sm:p-10">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
                      Complete access
                    </p>

                    <h3 className="mt-3 text-3xl font-black">
                      Investment OS
                    </h3>

                    <p className="mt-3 max-w-lg leading-7 text-slate-300">
                      Portfolio monitoring, personalised
                      analysis and goal tracking in one
                      clear platform.
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-4xl font-black">
                      €7.99
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      per month
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10">
                <div className="grid gap-4 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                    <BenefitRow
                      key={benefit}
                      text={benefit}
                    />
                  ))}
                </div>

                <Link
                  href="/upload"
                  className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Start your 24-hour free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  Then €7.99 per month. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Frequently asked questions"
              title="Clear answers before you get started"
              description="Everything you need to know about portfolio uploads, market data, privacy and your subscription."
            />

            <div className="mt-12 space-y-4">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-950">
                    {item.question}

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-3">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-white/10 bg-white/5 p-7"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="mt-6 text-xl font-bold">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-2xl sm:p-12">
            <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.17em] text-blue-100">
                  Start building clarity
                </p>

                <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  Your investments deserve more than a
                  collection of disconnected tools
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
                  Bring your portfolio, market context
                  and financial goal together in one
                  Investment Operating System.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-bold text-slate-950 shadow-lg"
                >
                  Start your 24-hour free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="mailto:hello@investmentos.app"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-4 text-sm font-bold text-white"
                >
                  <Mail className="h-4 w-4" />
                  Contact us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="font-black text-slate-950">
                Investment OS
              </p>

              <p className="text-xs text-slate-500">
                Portfolio intelligence, goals and market
                context.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
            <Link href="#contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>

          <p className="max-w-md text-xs leading-5 text-slate-500 lg:text-right">
            Investment OS is a decision-support and
            monitoring tool. It does not provide personal
            financial advice or guarantee investment
            results.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
        {title}
      </h2>

      <p className="mt-5 text-lg leading-8 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function TrustPoint({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      <Check className="h-4 w-4 text-emerald-600" />
      {text}
    </div>
  );
}

function PreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function MiniPreviewCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-slate-700" />

      <p className="mt-3 text-sm font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function BriefingPoint({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <CheckCircleIcon />

      <span className="text-sm font-semibold">
        {text}
      </span>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-violet-700">
      <Check className="h-4 w-4" />
    </div>
  );
}

function BenefitRow({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" />
      </div>

      <p className="text-sm font-semibold leading-6 text-slate-700">
        {text}
      </p>
    </div>
  );
}