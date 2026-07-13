import PageNavigation from "../../components/PageNavigation";

type BriefingItem = {
  title: string;
  category: string;
  impact: "Positive" | "Neutral" | "Negative";
  summary: string;
  portfolioEffect: string;
  holdings: string[];
  time: string;
};

const briefingItems: BriefingItem[] = [
  {
    title: "Bitcoin remains supported by improving market liquidity",
    category: "Bitcoin",
    impact: "Positive",
    summary:
      "Digital assets are benefiting from stronger risk appetite and improving liquidity conditions. Bitcoin remains volatile, but the broader trend is constructive.",
    portfolioEffect:
      "Positive for IB1T, although the large portfolio weight means volatility can still dominate the total daily result.",
    holdings: ["IB1T"],
    time: "Today",
  },
  {
    title: "Global equity markets remain resilient",
    category: "Equities",
    impact: "Positive",
    summary:
      "Large global companies continue to benefit from earnings growth, investment in artificial intelligence and relatively stable economic demand.",
    portfolioEffect:
      "Supportive for VWCE and AIFS. These positions improve diversification beyond Bitcoin.",
    holdings: ["VWCE", "AIFS"],
    time: "Today",
  },
  {
    title: "Uranium investment case remains structurally strong",
    category: "Energy transition",
    impact: "Positive",
    summary:
      "Growing electricity demand and renewed interest in nuclear energy continue to support the long-term uranium investment case.",
    portfolioEffect:
      "Constructive for NUKL, but the position can remain sensitive to commodity sentiment and political developments.",
    holdings: ["NUKL"],
    time: "This week",
  },
  {
    title: "Interest-rate expectations remain an important market driver",
    category: "Macro",
    impact: "Neutral",
    summary:
      "Markets continue to react strongly to inflation data and expectations for central-bank policy. Lower rates would generally support growth assets.",
    portfolioEffect:
      "Falling rates would likely support IB1T, AIFS and VWCE. Higher-for-longer rates remain the main macro risk.",
    holdings: ["IB1T", "AIFS", "VWCE"],
    time: "This week",
  },
  {
    title: "Gold continues to provide defensive portfolio support",
    category: "Defensive assets",
    impact: "Neutral",
    summary:
      "Gold remains useful as protection against geopolitical uncertainty, currency weakness and unexpected inflation.",
    portfolioEffect:
      "PPFB lowers overall portfolio dependency on growth assets, although its current weight remains relatively small.",
    holdings: ["PPFB"],
    time: "This week",
  },
  {
    title: "Income position adds cash-flow diversification",
    category: "Income",
    impact: "Positive",
    summary:
      "The income-focused position adds a different return source to the portfolio and can help reduce dependence on price appreciation alone.",
    portfolioEffect:
      "STRC increases portfolio income, but issuer risk and product structure should remain under active review.",
    holdings: ["STRC"],
    time: "This month",
  },
];

const upcomingEvents = [
  {
    date: "Next release",
    title: "US inflation data",
    impact: "High impact",
    description:
      "Could influence rate expectations, the US dollar, equities and Bitcoin.",
  },
  {
    date: "This week",
    title: "Central-bank commentary",
    impact: "Medium impact",
    description:
      "Comments from policymakers may change expectations for future interest-rate decisions.",
  },
  {
    date: "Ongoing",
    title: "Bitcoin liquidity and ETF flows",
    impact: "High impact",
    description:
      "Sustained inflows may support Bitcoin, while large outflows could increase downside pressure.",
  },
];

const portfolioSignals = [
  {
    label: "Portfolio outlook",
    value: "Constructive",
    description: "Growth assets remain supported, but concentration is high.",
    tone: "positive",
  },
  {
    label: "Macro environment",
    value: "Neutral-positive",
    description: "Liquidity is improving, while rate uncertainty remains.",
    tone: "positive",
  },
  {
    label: "Main risk",
    value: "Concentration",
    description: "IB1T remains the dominant source of portfolio volatility.",
    tone: "warning",
  },
  {
    label: "Best diversifier",
    value: "VWCE",
    description: "Broad global exposure strengthens portfolio resilience.",
    tone: "neutral",
  },
];

function impactClasses(impact: BriefingItem["impact"]) {
  if (impact === "Positive") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (impact === "Negative") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function signalClasses(tone: string) {
  if (tone === "positive") {
    return "bg-emerald-400";
  }

  if (tone === "warning") {
    return "bg-amber-400";
  }

  return "bg-sky-400";
}

export default function BriefingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <PageNavigation />

        <section className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Daily intelligence
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Portfolio briefing
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                The most relevant market, macro and portfolio developments in
                one clear overview.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Briefing status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="font-bold text-slate-900">Up to date</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Today&apos;s conclusion
              </p>

              <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
                The portfolio outlook remains constructive, but Bitcoin
                concentration is still the main risk.
              </h2>

              <p className="mt-5 max-w-3xl leading-7 text-slate-300">
                Growth assets continue to benefit from improving liquidity and
                resilient equity markets. New capital should primarily
                strengthen diversified and defensive positions rather than
                increase Bitcoin exposure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric label="Portfolio tone" value="Positive" />
              <HeroMetric label="Risk level" value="High" />
              <HeroMetric label="Opportunities" value="3" />
              <HeroMetric label="Warnings" value="1" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {portfolioSignals.map((signal) => (
            <article
              key={signal.label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${signalClasses(
                    signal.tone,
                  )}`}
                />

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {signal.label}
                </p>
              </div>

              <p className="mt-4 text-2xl font-bold">{signal.value}</p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {signal.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-9 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Market intelligence
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Developments affecting your portfolio
              </h2>
            </div>

            <div className="space-y-5">
              {briefingItems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {item.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${impactClasses(
                            item.impact,
                          )}`}
                        >
                          {item.impact}
                        </span>
                      </div>

                      <h3 className="mt-4 max-w-3xl text-xl font-bold leading-7">
                        {item.title}
                      </h3>
                    </div>

                    <span className="text-sm font-medium text-slate-400">
                      {item.time}
                    </span>
                  </div>

                  <p className="mt-4 leading-7 text-slate-600">
                    {item.summary}
                  </p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Portfolio impact
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.portfolioEffect}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.holdings.map((holding) => (
                      <span
                        key={holding}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        {holding}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <div className="sticky top-6 space-y-6">
              <article className="rounded-[1.75rem] bg-slate-900 p-7 text-white shadow-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Investment coach
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Focus new investments on diversification
                </h2>

                <p className="mt-4 leading-7 text-slate-300">
                  The current portfolio already has significant upside
                  potential. The priority is now to improve balance without
                  selling the main Bitcoin position.
                </p>

                <div className="mt-6 space-y-3">
                  <CoachRow number="1" text="Prioritise VWCE contributions" />
                  <CoachRow number="2" text="Gradually strengthen PPFB" />
                  <CoachRow number="3" text="Avoid new Bitcoin purchases" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Upcoming events
                </p>

                <h2 className="mt-2 text-2xl font-bold">What to watch next</h2>

                <div className="mt-6 space-y-6">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.title}
                      className="border-b border-slate-100 pb-6 last:border-none last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          {event.date}
                        </p>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {event.impact}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-slate-900">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {event.description}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                <p className="text-sm font-bold text-amber-900">
                  Important reminder
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This briefing is a decision-support tool. Market views and
                  scenarios can change and are not guarantees of future
                  performance.
                </p>
              </article>
            </div>
          </aside>
        </section>
      </div>

    </main>
  );
}

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function CoachRow({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-950">
        {number}
      </div>

      <p className="text-sm font-semibold text-slate-100">{text}</p>
    </div>
  );
}