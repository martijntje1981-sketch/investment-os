import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Target,
  WalletCards,
} from "lucide-react";

import { holdings } from "@/lib/services/portfolio/holdings";
import { LocalUpdateTime } from "@/components/home/LocalUpdateTime";
import BottomNavigation from "@/components/home/BottomNav";
import { GoalTracker } from "@/components/home/GoalTracker";
import { InvestmentScore } from "@/components/home/InvestmentScore";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import { TodayStatus } from "@/components/home/TodayStatus";
import { TodaysBriefing } from "@/components/home/TodaysBriefing";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { homeData } from "@/lib/home-data";
import { getMarketQuote } from "@/lib/services/market/priceService";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLivePrice(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getCurrentDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function cleanGreeting(greeting: string) {
  return greeting
    .replaceAll("👋", "")
    .replaceAll("👋🏻", "")
    .replaceAll("👋🏼", "")
    .replaceAll("👋🏽", "")
    .replaceAll("👋🏾", "")
    .replaceAll("👋🏿", "")
    .trim();
}

export default async function Home() {
  const primaryHolding = holdings[0];
  const liveQuote = await getMarketQuote(primaryHolding.symbol);

  const {
    status,
    briefing,
    investmentScore,
    portfolio,
    goal,
    events,
  } = homeData;

  const isPositiveToday = portfolio.todayChange >= 0;
  const isLiveQuotePositive = liveQuote.changePercent >= 0;

  const greeting = cleanGreeting(homeData.greeting);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1200px] px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-8 sm:px-8 sm:pt-14">
        <header>
          <p className="text-sm font-medium capitalize text-slate-500">
            {getCurrentDate()}
          </p>

          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[#0F172A] sm:text-[42px]">
            {greeting}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Here is your portfolio overview and investment briefing for today.
          </p>
        </header>

        <section className="mt-8 overflow-hidden rounded-[28px] bg-[#071126] text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <WalletCards size={17} />
                    Total portfolio
                  </div>

                  <p className="mt-4 text-[40px] font-semibold tracking-[-0.04em] sm:text-[52px]">
                    {formatCurrency(portfolio.totalValue)}
                  </p>

                  <div
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      isPositiveToday
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-rose-400/15 text-rose-300"
                    }`}
                  >
                    {isPositiveToday ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}

                    {isPositiveToday ? "+" : ""}
                    {formatCurrency(portfolio.todayChange)} today
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      Today
                    </p>

                    <p
                      className={`mt-2 text-xl font-semibold ${
                        isPositiveToday
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {isPositiveToday ? "+" : ""}
                      {portfolio.todayPercent.toFixed(2)}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      Goal progress
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {goal.progress.toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      Score
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {investmentScore.score}/100
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      Target
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatCurrency(goal.target)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                  <Activity size={18} className="text-orange-500" />
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                    Live market
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
                    {primaryHolding.name}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-[34px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[40px]">
                ${formatLivePrice(liveQuote.price)}
              </p>

              <div
                className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${
                  isLiveQuotePositive
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {isLiveQuotePositive ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}

                {isLiveQuotePositive ? "+" : ""}
                {liveQuote.changePercent.toFixed(2)}% today
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[390px]">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Portfolio weight
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  64%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Position
                </p>

                <p className="mt-1 text-xl font-semibold text-slate-900">
                  Core
                </p>
              </div>

              <div className="col-span-2 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Market data
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  <LocalUpdateTime updatedAt={liveQuote.updatedAt} />
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={20} />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500">
              Portfolio status
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-950">
              Healthy
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Target size={20} />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500">
              Million goal
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-950">
              {goal.yearsRemaining} years remaining
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Activity size={20} />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500">
              Investment score
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-950">
              {investmentScore.badge}
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-12 sm:mt-12 sm:gap-14">
          <TodayStatus
            message={status.message}
            explanation={status.explanation}
          />

          <TodaysBriefing items={briefing} />

          <InvestmentScore
            score={investmentScore.score}
            badge={investmentScore.badge}
            explanation={investmentScore.explanation}
          />

          <PortfolioSnapshot
            totalValue={portfolio.totalValue}
            todayChange={portfolio.todayChange}
            todayPercent={portfolio.todayPercent}
            bestHolding={portfolio.bestHolding}
            worstHolding={portfolio.worstHolding}
          />

          <GoalTracker
            target={goal.target}
            current={goal.current}
            progress={goal.progress}
            yearsRemaining={goal.yearsRemaining}
          />

          <UpcomingEvents events={events} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}