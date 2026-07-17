"use client";

import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Globe2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type IntelligenceMetric = {
  label: string;
  score: number;
  status: "strong" | "attention" | "risk";
  icon: React.ElementType;
};

const metrics: IntelligenceMetric[] = [
  {
    label: "Growth potential",
    score: 91,
    status: "strong",
    icon: TrendingUp,
  },
  {
    label: "Diversification",
    score: 72,
    status: "attention",
    icon: Globe2,
  },
  {
    label: "Risk balance",
    score: 64,
    status: "attention",
    icon: ShieldCheck,
  },
  {
    label: "Income potential",
    score: 76,
    status: "strong",
    icon: WalletCards,
  },
  {
    label: "Goal alignment",
    score: 84,
    status: "strong",
    icon: Target,
  },
];

function getStatusClasses(status: IntelligenceMetric["status"]) {
  if (status === "strong") {
    return {
      background: "bg-emerald-50",
      text: "text-emerald-700",
      bar: "bg-emerald-500",
      icon: CheckCircle2,
    };
  }

  if (status === "risk") {
    return {
      background: "bg-red-50",
      text: "text-red-700",
      bar: "bg-red-500",
      icon: AlertTriangle,
    };
  }

  return {
    background: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
    icon: AlertTriangle,
  };
}

export default function InvestmentIntelligence() {
  const overallScore = 79;

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white sm:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <BrainCircuit className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-[-0.03em]">
                  Investment Intelligence
                </h2>

                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Portfolio view
                </span>
              </div>

              <p className="mt-2 max-w-[620px] text-sm leading-6 text-slate-300">
                A first portfolio-level assessment based on concentration,
                growth exposure, defensive assets and goal alignment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Overall score
              </p>

              <p className="mt-1 text-3xl font-bold">
                {overallScore}
                <span className="text-base font-semibold text-slate-400">
                  /100
                </span>
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-400 text-sm font-bold text-white">
              Good
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Portfolio assessment
          </h3>

          <div className="mt-5 space-y-4">
            {metrics.map((metric) => {
              const status = getStatusClasses(metric.status);
              const StatusIcon = status.icon;
              const MetricIcon = metric.icon;

              return (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.background} ${status.text}`}
                      >
                        <MetricIcon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          {metric.label}
                        </p>

                        <div
                          className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${status.text}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />

                          {metric.status === "strong"
                            ? "Strong"
                            : metric.status === "risk"
                              ? "High risk"
                              : "Needs attention"}
                        </div>
                      </div>
                    </div>

                    <p className="text-xl font-bold text-slate-950">
                      {metric.score}
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${status.bar}`}
                      style={{
                        width: `${metric.score}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />

              <h3 className="font-bold">AI portfolio summary</h3>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              Your portfolio is positioned strongly for long-term growth.
              Bitcoin remains the dominant position and therefore drives a
              large part of both the upside and the risk. Uranium and AI
              infrastructure add attractive growth exposure, while global
              equities and gold improve balance.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              The main improvement opportunity is diversification. Gradually
              increasing the weight of broad global equities could reduce
              concentration risk without requiring you to sell your Bitcoin
              position.
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />

              <h3 className="font-bold">Main portfolio risk</h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              A large percentage of the portfolio is concentrated in IB1T.
              This means Bitcoin price movements can have a disproportionate
              impact on the total portfolio value.
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />

              <h3 className="font-bold">Current strength</h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              The portfolio combines several structural themes: Bitcoin, AI
              infrastructure, nuclear energy, global equities, income and
              gold. This creates multiple potential return drivers.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
        <p className="text-xs leading-5 text-slate-500">
          This first score is based on the current portfolio structure. It is
          not personal financial advice. Later versions will use live market
          data, your goals and risk preferences.
        </p>
      </div>
    </section>
  );
}