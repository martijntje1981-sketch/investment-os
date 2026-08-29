import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Gauge,
  Goal,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import MarketingHeader from "@/components/marketing/MarketingHeader";
import { PublicFourQuestionsSection } from "@/components/marketing/PublicFourQuestionsSection";
import { PublicPortfolioMixer } from "@/components/marketing/PublicPortfolioMixer";
import { PublicProductModelsSection } from "@/components/marketing/PublicProductModelsSection";
import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import {
  pricingAvailabilityNote,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import { createClient } from "@/lib/supabase/server";

const workflowSteps = [
  {
    number: "01",
    title: "Add your portfolio",
    description:
      "Enter holdings yourself or import a supported CSV or Excel file, then review before saving.",
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
    title: "Answer the four questions daily",
    description:
      "Dashboard for a quick glance, question hubs for the story, Analysis when you want the deep dive.",
    icon: Gauge,
  },
];

const benefits = [
  "Smart Dashboard for today’s four-question glance",
  "Your Review for today, this week and this month",
  "Portfolio History, Goals and Portfolio Scorecard",
  "Export portfolio (.xlsx) — one Excel workbook, organised sheets",
  "Relevant News, Market Pulse and Perspectives",
  "Demo to explore; personal trial starts empty and editable",
];

const faqItems = [
  {
    question: "Does Tobailey provide financial advice?",
    answer:
      "No. Tobailey provides portfolio tracking, analysis and educational information. It does not provide personalised financial advice or recommend buying, selling or holding investments.",
  },
  {
    question: "How does Tobailey receive my portfolio?",
    answer:
      "Tobailey supports manual entry and CSV or Excel import, followed by a review step. You remain in control of which holdings are saved.",
  },
  {
    question: "What is the difference between Free and Complete?",
    answer:
      "Tobailey Free (€0) includes portfolio tracking, the Four Questions and headline intelligence with limited depth. Tobailey Complete (€5.99/month) includes everything in Free plus full intelligence depth and deeper analysis where your data supports it. New eligible users start with a 14-day Complete trial, then choose Complete or Free. There are no ads.",
  },
  {
    question: "What is the difference between Demo and personal trial?",
    answer:
      "Demo is a ready-made, read-only portfolio so you can explore. Personal trial starts empty and editable — you import or add your own holdings. Demo data never becomes your personal portfolio.",
  },
  {
    question: "Are market prices always real time?",
    answer:
      "Market-data availability and update frequency depend on the selected data provider, exchange and subscription level. The product clearly shows whether data is live, cached or using a fallback price.",
  },
  {
    question: "Can I use Tobailey with any broker?",
    answer:
      "Yes. Tobailey is independent and supports portfolio information through manual entry and supported CSV or Excel imports — no broker login required.",
  },
  {
    question: "Is my portfolio stored securely?",
    answer:
      "Tobailey uses appropriate technical and organisational safeguards to protect account and portfolio information. You remain in control of the information you upload.",
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" ? params.type : null;
  const next = typeof params.next === "string" ? params.next : null;
  const example = typeof params.example === "string" ? params.example : null;

  // Defensive: Supabase Site URL fallbacks can land auth codes on `/`.
  // Forward them to the real callback so sessions and example activation run.
  if (code || tokenHash) {
    const forward = new URLSearchParams();
    if (code) forward.set("code", code);
    if (tokenHash) forward.set("token_hash", tokenHash);
    if (type) forward.set("type", type);
    if (next) forward.set("next", next);
    else forward.set("next", "/dashboard");
    if (example) forward.set("example", example);
    redirect(`/auth/callback?${forward.toString()}`);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
          <div className="absolute left-1/2 top-0 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/25 via-brand-soft/60 to-transparent blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand-navy">
                <Sparkles className="h-4 w-4 text-brand" />
                Your investments. Understood.
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.065em] text-brand-navy sm:text-7xl">
                Understand your money
                <span className="block text-brand">in four questions</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                Tobailey connects portfolio, markets, news, goals, risk and
                intelligence into a simple daily view — not a broker, trading
                platform or financial adviser.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup?intent=trial"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-bold text-brand-navy shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-hover"
                >
                  Start with 14 days of Complete
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/explore"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Explore Demo Portfolio
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <Link
                href="#portfolio-mixer"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-brand-navy underline-offset-4 hover:underline"
              >
                Try the Portfolio Mixer
              </Link>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Personal trial starts with your own empty portfolio. Demo is a
                separate read-only showroom.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <TrustPoint text="Information only — not financial advice" />
                <TrustPoint text="Portfolio-first intelligence" />
                <TrustPoint text="Built for private investors" />
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 sm:p-6">
                <div className="rounded-[26px] border border-white/10 bg-brand-navy p-6 text-white sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
                    The four questions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    Illustrative product language — the same structure you will
                    see after signup.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {FOUR_QUESTIONS.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <p
                          className={`text-[11px] font-black uppercase tracking-[0.14em] ${question.visual.onDark}`}
                        >
                          {question.numberLabel} · {question.shortNavLabel}
                        </p>
                        <p className="mt-1.5 text-sm font-bold text-white">
                          {question.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicPortfolioMixer />

        {/* FOUR QUESTIONS */}
        <PublicFourQuestionsSection />

        {/* HOW TOBAILEY WORKS */}
        <section
          id="how-it-works"
          className="scroll-mt-24 bg-brand-navy px-5 py-20 text-white sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
                  How Tobailey works
                </p>

                <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  From portfolio setup to four clear answers
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Start with what you already own. Tobailey turns it into a
                  calm daily view — glance, question, then deep dive when you
                  need it.
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
                        <h3 className="text-xl font-bold">{step.title}</h3>

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

        {/* FREE VS COMPLETE */}
        <PublicProductModelsSection />

        {/* DEMO / TRIAL */}
        <section
          id="pricing"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Demo or personal trial"
              title="Explore first, or start with your portfolio"
              description="Demo is a read-only showroom. Personal trial is 14 days of Tobailey Complete with your empty, editable portfolio. After that, continue with Complete for €5.99/month or keep using Tobailey Free."
            />

            <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <BenefitRow key={benefit} text={benefit} />
                ))}
              </div>

              <p className="mt-6 text-sm leading-6 text-slate-600">
                {pricingAvailabilityNote.text}{" "}
                <Link
                  href={SUPPORTED_INSTRUMENTS_PATH}
                  className="font-bold text-blue-700 hover:text-blue-800"
                >
                  {pricingAvailabilityNote.linkLabel}
                </Link>
              </p>

              <Link
                href="/signup?intent=trial"
                className="mt-9 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-bold text-brand-navy transition hover:bg-brand-hover"
              >
                Start with 14 days of Complete
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Explore Demo Portfolio
              </Link>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Demo is read-only. Personal trial starts empty. After 14 days:
                Complete for €5.99/month, or Tobailey Free. Cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Frequently asked questions"
              title="Clear answers before you get started"
              description="Everything you need to know about portfolio uploads, Demo vs trial, privacy and your subscription."
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

        {/* TRUST / IMPACT PLACEHOLDER / DISCLAIMERS */}
        <section className="bg-brand-navy px-5 py-20 text-white sm:px-8 sm:py-24">
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

                    <h3 className="mt-6 text-xl font-bold">{item.title}</h3>

                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-7 text-slate-400">
              Future impact: Tobailey plans to allocate a fixed amount per paid
              user to a verified environmental partner. Partner details and
              tracking are not live yet — no trees planted or donations claimed
              today.
            </p>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-brand-navy via-brand-deep to-q4-deep p-8 text-white shadow-[var(--navy-shadow)] sm:p-12">
            <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.17em] text-slate-400">
                  Start with clarity
                </p>

                <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  Four questions. One portfolio intelligence layer.
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Bring your portfolio, market context and financial goal
                  together — then see the same four answers inside Tobailey.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3">
                <Link
                  href="/signup?intent=trial"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-bold text-brand-navy shadow-lg"
                >
                  Start with 14 days of Complete
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white"
                >
                  Explore Demo Portfolio
                </Link>

                <a
                  href="mailto:hello@investmentos.app"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-4 text-sm font-bold text-white"
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
          <div className="flex items-center">
            <TobaileyLogo size={40} showWordmark showTagline />
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            <Link href="#portfolio-mixer">Portfolio Mixer</Link>
            <Link href="#four-questions">Four Questions</Link>
            <Link href="#plans">Plans</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
            <Link href={SUPPORTED_INSTRUMENTS_PATH}>Supported instruments</Link>
            <Link href="#contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/explore">Explore Tobailey</Link>
          </nav>

          <p className="max-w-md text-xs leading-5 text-slate-500 lg:text-right">
            Tobailey is a decision-support and monitoring tool. It does not
            provide personal financial advice or guarantee investment results.
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

      <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  );
}

function TrustPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      <Check className="h-4 w-4 text-emerald-600" />
      {text}
    </div>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" />
      </div>

      <p className="text-sm font-semibold leading-6 text-slate-700">{text}</p>
    </div>
  );
}
