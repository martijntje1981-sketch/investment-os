"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Goal,
  PiggyBank,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import NumericInput from "@/components/NumericInput";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { loadUserPortfolioHoldings } from "@/lib/client/portfolioPricing";
import {
  computeGoalProgress,
  GOAL_FORM_DEFAULT,
  isGoalAchieved,
} from "@/lib/client/userGoalStorage";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function calculatePortfolioValue(holdings: ReturnType<typeof loadUserPortfolioHoldings>) {
  return holdings.reduce(
    (total, holding) => total + (getHoldingMarketValue(holding) ?? 0),
    0,
  );
}

function projectValue(
  startingValue: number,
  monthlyContribution: number,
  annualReturn: number,
  months: number,
) {
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  let value = startingValue;

  for (let month = 0; month < months; month += 1) {
    value = value * (1 + monthlyRate) + monthlyContribution;
  }

  return value;
}

export default function GoalsPage() {
  const { userSub, authReady, holdings, portfolioReady } = useUserPortfolio();
  const { goal: savedGoal, hasSavedGoal, persistGoal } = useUserGoal();
  const [goal, setGoal] = useState<GoalSettings>(GOAL_FORM_DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (savedGoal) {
      setGoal(savedGoal);
    }
  }, [savedGoal]);

  const portfolioValue = useMemo(
    () => calculatePortfolioValue(holdings),
    [holdings],
  );

  const currentYear = new Date().getFullYear();
  const monthsRemaining = Math.max((goal.targetYear - currentYear) * 12, 0);
  const progress = goal.targetValue > 0
    ? computeGoalProgress(portfolioValue, goal)
    : 0;
  const goalCompleted = isGoalAchieved(portfolioValue, goal);

  const projectedValue = useMemo(
    () => projectValue(
      portfolioValue,
      goal.monthlyContribution,
      goal.expectedAnnualReturn,
      monthsRemaining,
    ),
    [goal, monthsRemaining, portfolioValue],
  );

  const difference = projectedValue - goal.targetValue;
  const health = projectedValue >= goal.targetValue
    ? "On track"
    : projectedValue >= goal.targetValue * 0.85
      ? "Attention needed"
      : "Off track";

  const healthClasses = health === "On track"
    ? "bg-emerald-100 text-emerald-700"
    : health === "Attention needed"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";

  function updateGoal(field: keyof GoalSettings, value: string) {
    setSaved(false);
    setGoal((current) => ({ ...current, [field]: Number(value) }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userSub) return;
    persistGoal(goal);
    setSaved(true);
  }

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <header className="mt-8 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              Your financial goal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              Know where you are heading.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Set one clear target. Investment OS uses your current portfolio to show whether your plan is on track.
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Goal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Set your goal</h2>
                  <p className="text-sm text-slate-500">Four inputs, saved in one step.</p>
                </div>
              </div>

              <div className="mt-7 space-y-5">
                <GoalInput
                  label="Target amount"
                  icon={<Target className="h-4 w-4" />}
                  prefix="€"
                  value={goal.targetValue}
                  min={1_000}
                  step={1_000}
                  onChange={(value) => updateGoal("targetValue", value)}
                />
                <GoalInput
                  label="Target year"
                  icon={<CalendarDays className="h-4 w-4" />}
                  value={goal.targetYear}
                  min={currentYear + 1}
                  max={currentYear + 60}
                  step={1}
                  onChange={(value) => updateGoal("targetYear", value)}
                />
                <GoalInput
                  label="Monthly contribution"
                  icon={<PiggyBank className="h-4 w-4" />}
                  prefix="€"
                  value={goal.monthlyContribution}
                  min={0}
                  step={50}
                  onChange={(value) => updateGoal("monthlyContribution", value)}
                />
                <GoalInput
                  label="Expected annual return"
                  icon={<TrendingUp className="h-4 w-4" />}
                  suffix="%"
                  value={goal.expectedAnnualReturn}
                  min={0}
                  max={50}
                  step={0.5}
                  onChange={(value) => updateGoal("expectedAnnualReturn", value)}
                />
              </div>

              <button
                type="submit"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Goal saved" : "Save goal"}
              </button>
            </form>

            <section className="overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Goal dashboard</p>
                  <p className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                    {goalCompleted
                      ? "Goal achieved"
                      : formatPercentage(progress)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {goalCompleted
                      ? `Your portfolio has reached ${formatCurrency(goal.targetValue)}.`
                      : `of ${formatCurrency(goal.targetValue)}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-black ${healthClasses}`}>
                  {health}
                </span>
              </div>

              <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
                  style={{ width: `${Math.max(progress, goalCompleted ? 100 : hasSavedGoal ? 1 : 0)}%` }}
                />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <ResultCard label="Current portfolio" value={formatCurrency(portfolioValue)} />
                <ResultCard label={`Projected in ${goal.targetYear}`} value={formatCurrency(projectedValue)} />
                <ResultCard label="Monthly contribution" value={formatCurrency(goal.monthlyContribution)} />
                <ResultCard label="Expected return" value={formatPercentage(goal.expectedAnnualReturn)} />
              </div>

              <div className={`mt-6 rounded-2xl border p-5 ${
                difference >= 0
                  ? "border-emerald-400/20 bg-emerald-400/10"
                  : "border-amber-400/20 bg-amber-400/10"
              }`}>
                <p className="text-sm font-bold">
                  {difference >= 0
                    ? `Projected buffer: ${formatCurrency(difference)}`
                    : `Projected shortfall: ${formatCurrency(Math.abs(difference))}`}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This projection is an estimate based on your inputs. Returns are not guaranteed and this is not financial advice.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}

function GoalInput({
  label,
  icon,
  prefix,
  suffix,
  value,
  min,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </span>
      <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
        {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
        <NumericInput
          required
          value={value}
          min={min}
          placeholder={prefix ? "0.00" : suffix ? "0.0" : "0"}
          onChange={(next) => onChange(String(next))}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-base font-bold outline-none"
        />
        {suffix && <span className="font-bold text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}