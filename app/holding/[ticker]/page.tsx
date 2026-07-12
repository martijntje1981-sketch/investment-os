import Link from "next/link";

type HoldingData = {
  ticker: string;
  name: string;
  category: string;
  price: string;
  dailyChange: string;
  dailyPositive: boolean;
  positionValue: string;
  portfolioWeight: string;
  totalReturn: string;
  totalPositive: boolean;
  investmentScore: string;
  stance: string;
  stanceStyle: string;
  summary: string;
  thesis: string[];
  catalysts: string[];
  risks: string[];
  metrics: {
    label: string;
    value: string;
  }[];
};

const holdings: Record<string, HoldingData> = {
  ib1t: {
    ticker: "IB1T",
    name: "iShares Bitcoin ETP",
    category: "Digital Assets",
    price: "€5.16",
    dailyChange: "+1.84%",
    dailyPositive: true,
    positionValue: "€58,100",
    portfolioWeight: "67%",
    totalReturn: "-26.6%",
    totalPositive: false,
    investmentScore: "8.4",
    stance: "Hold",
    stanceStyle: "bg-amber-100 text-amber-800",
    summary:
      "Bitcoin remains the main growth engine in the portfolio, but the position is currently much larger than the intended long-term allocation. The underlying long-term thesis remains intact, while concentration risk requires careful monitoring.",
    thesis: [
      "Scarce digital asset with a fixed maximum supply",
      "Growing institutional adoption through regulated investment products",
      "Potential beneficiary of increasing global liquidity",
      "Long-term asymmetric return potential",
    ],
    catalysts: [
      "Higher institutional and ETF demand",
      "Falling exchange balances",
      "Increasing global liquidity and money supply",
      "Improving regulatory clarity",
    ],
    risks: [
      "Very high portfolio concentration",
      "Large short-term price volatility",
      "Regulatory or taxation changes",
      "Extended periods of negative market sentiment",
    ],
    metrics: [
      { label: "Units", value: "11,269" },
      { label: "Average Purchase", value: "€7.03" },
      { label: "Asset Class", value: "Bitcoin" },
      { label: "Risk Level", value: "Very High" },
    ],
  },

  nukl: {
    ticker: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies ETF",
    category: "Thematic Equity",
    price: "€46.58",
    dailyChange: "-0.72%",
    dailyPositive: false,
    positionValue: "€7,500",
    portfolioWeight: "9%",
    totalReturn: "-12.0%",
    totalPositive: false,
    investmentScore: "7.8",
    stance: "Accumulate Carefully",
    stanceStyle: "bg-blue-100 text-blue-800",
    summary:
      "NUKL provides exposure to the long-term nuclear energy and uranium investment theme. The position has underperformed recently, but structural demand from energy security, electrification and data centres continues to support the long-term thesis.",
    thesis: [
      "Growing electricity demand from AI and data centres",
      "Renewed political support for nuclear power",
      "Long construction cycles restrict new supply",
      "Uranium demand may exceed available production",
    ],
    catalysts: [
      "New reactor approvals and restarts",
      "Long-term uranium supply contracts",
      "Government support for energy security",
      "Rising electricity demand",
    ],
    risks: [
      "Commodity and mining-sector volatility",
      "Political delays in nuclear projects",
      "High sensitivity to uranium prices",
      "Long periods of thematic underperformance",
    ],
    metrics: [
      { label: "Units", value: "161" },
      { label: "Theme", value: "Nuclear Energy" },
      { label: "Asset Class", value: "Equity ETF" },
      { label: "Risk Level", value: "High" },
    ],
  },

  vwce: {
    ticker: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    category: "Global Equity",
    price: "€128.40",
    dailyChange: "+0.31%",
    dailyPositive: true,
    positionValue: "€8,900",
    portfolioWeight: "10%",
    totalReturn: "+6.0%",
    totalPositive: true,
    investmentScore: "8.8",
    stance: "Core Holding",
    stanceStyle: "bg-emerald-100 text-emerald-800",
    summary:
      "VWCE is the broadest diversified holding in the portfolio. It provides exposure to thousands of companies across developed and emerging markets and acts as the stabilising core around the more concentrated thematic positions.",
    thesis: [
      "Broad global diversification",
      "Low-cost passive exposure",
      "Participation in long-term global economic growth",
      "Reduces reliance on individual themes",
    ],
    catalysts: [
      "Improving global economic growth",
      "Falling interest rates",
      "Corporate earnings growth",
      "Continued long-term equity market appreciation",
    ],
    risks: [
      "Global recession",
      "Equity valuation compression",
      "Currency fluctuations",
      "Large exposure to US mega-cap companies",
    ],
    metrics: [
      { label: "Region", value: "Global" },
      { label: "Strategy", value: "Passive Index" },
      { label: "Asset Class", value: "Equity ETF" },
      { label: "Risk Level", value: "Medium" },
    ],
  },

  aifs: {
    ticker: "AIFS",
    name: "AI Infrastructure ETF",
    category: "Technology Theme",
    price: "€10.19",
    dailyChange: "+1.12%",
    dailyPositive: true,
    positionValue: "€5,300",
    portfolioWeight: "8%",
    totalReturn: "+2.0%",
    totalPositive: true,
    investmentScore: "8.2",
    stance: "Growth Holding",
    stanceStyle: "bg-violet-100 text-violet-800",
    summary:
      "AIFS targets the infrastructure behind artificial intelligence, including semiconductors, data centres, networking and power systems. It offers strong structural growth potential, but valuations and technology cycles require disciplined position sizing.",
    thesis: [
      "AI adoption requires major infrastructure investment",
      "Growing demand for chips, data centres and networking",
      "Long-term productivity growth from artificial intelligence",
      "Exposure to multiple layers of the AI value chain",
    ],
    catalysts: [
      "Higher AI capital expenditure",
      "Cloud and data-centre expansion",
      "New semiconductor demand",
      "Increasing enterprise AI adoption",
    ],
    risks: [
      "High technology-sector valuations",
      "Semiconductor cycle volatility",
      "Concentration in large US technology companies",
      "Potential slowdown in AI investment",
    ],
    metrics: [
      { label: "Units", value: "520" },
      { label: "Theme", value: "AI Infrastructure" },
      { label: "Asset Class", value: "Equity ETF" },
      { label: "Risk Level", value: "High" },
    ],
  },
};

const defaultHolding: HoldingData = {
  ticker: "HOLDING",
  name: "Investment Holding",
  category: "Portfolio Asset",
  price: "€0.00",
  dailyChange: "0.00%",
  dailyPositive: true,
  positionValue: "€0",
  portfolioWeight: "0%",
  totalReturn: "0.00%",
  totalPositive: true,
  investmentScore: "—",
  stance: "Under Review",
  stanceStyle: "bg-slate-100 text-slate-700",
  summary:
    "Detailed Investment OS analysis for this holding will be added when portfolio and market data are connected.",
  thesis: [
    "Investment thesis will appear here",
    "Portfolio role will be assessed",
    "Long-term potential will be evaluated",
    "Data connection is still required",
  ],
  catalysts: [
    "Market developments",
    "Company or sector growth",
    "Improving macro conditions",
    "Positive analyst revisions",
  ],
  risks: [
    "Market volatility",
    "Portfolio concentration",
    "Unexpected macro developments",
    "Investment thesis deterioration",
  ],
  metrics: [
    { label: "Units", value: "—" },
    { label: "Category", value: "—" },
    { label: "Asset Class", value: "—" },
    { label: "Risk Level", value: "—" },
  ],
};

export default async function HoldingPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const normalizedTicker = ticker.toLowerCase();

  const baseHolding = holdings[normalizedTicker] ?? defaultHolding;

  const holding =
    holdings[normalizedTicker] ??
    ({
      ...baseHolding,
      ticker: ticker.toUpperCase(),
      name: `${ticker.toUpperCase()} Holding`,
    } satisfies HoldingData);

  return (
    <main className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <span>←</span>
          Back to Portfolio
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {holding.category}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${holding.stanceStyle}`}
                >
                  {holding.stance}
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
                {holding.ticker}
              </h1>

              <p className="mt-2 text-lg text-slate-300">{holding.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 lg:text-right">
              <div>
                <p className="text-sm text-slate-400">Current Price</p>
                <p className="mt-2 text-3xl font-bold">{holding.price}</p>
                <p
                  className={`mt-1 font-semibold ${
                    holding.dailyPositive
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {holding.dailyChange} today
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Investment Score</p>
                <p className="mt-2 text-3xl font-bold">
                  {holding.investmentScore}
                  <span className="text-lg text-slate-500">/10</span>
                </p>
                <p className="mt-1 font-semibold text-blue-400">
                  Investment OS rating
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Position Value"
            value={holding.positionValue}
            subtitle="Current market value"
          />

          <MetricCard
            label="Portfolio Weight"
            value={holding.portfolioWeight}
            subtitle="Share of total portfolio"
          />

          <MetricCard
            label="Total Return"
            value={holding.totalReturn}
            subtitle="Since purchase"
            positive={holding.totalPositive}
          />

          <MetricCard
            label="Investment Score"
            value={`${holding.investmentScore}/10`}
            subtitle={holding.stance}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Performance
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Price Development
                </h2>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
                <button className="rounded-lg px-3 py-2">1M</button>
                <button className="rounded-lg px-3 py-2">6M</button>
                <button className="rounded-lg bg-white px-3 py-2 text-slate-900 shadow-sm">
                  1Y
                </button>
                <button className="rounded-lg px-3 py-2">MAX</button>
              </div>
            </div>

            <div className="relative mt-8 h-72 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 to-white">
              <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
              <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 800 280"
                preserveAspectRatio="none"
                aria-label="Placeholder performance chart"
              >
                <path
                  d="M0,220 C80,210 105,150 180,165 C245,178 270,110 340,125 C410,140 445,75 510,105 C575,130 625,55 690,75 C740,88 775,40 800,55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-blue-600"
                />

                <path
                  d="M0,220 C80,210 105,150 180,165 C245,178 270,110 340,125 C410,140 445,75 510,105 C575,130 625,55 690,75 C740,88 775,40 800,55 L800,280 L0,280 Z"
                  className="fill-blue-100/60"
                />
              </svg>

              <div className="absolute bottom-4 left-5 text-xs text-slate-400">
                Historical market data will be connected here
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Position Data
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Key Metrics
            </h2>

            <div className="mt-6 divide-y divide-slate-100">
              {holding.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between py-4"
                >
                  <span className="text-slate-500">{metric.label}</span>
                  <span className="font-semibold text-slate-900">
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-7 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl">
              ✦
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Investment OS Analysis
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                AI Summary
              </h2>

              <p className="mt-4 max-w-5xl text-lg leading-8 text-slate-600">
                {holding.summary}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <InsightCard
            title="Investment Thesis"
            label="Why it belongs"
            items={holding.thesis}
            icon="◎"
          />

          <InsightCard
            title="Key Catalysts"
            label="What could drive growth"
            items={holding.catalysts}
            icon="↗"
          />

          <InsightCard
            title="Primary Risks"
            label="What to monitor"
            items={holding.risks}
            icon="!"
            risk
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Portfolio Role
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Allocation Assessment
            </h2>

            <div className="mt-6 rounded-2xl bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Current Weight
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {holding.portfolioWeight}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{
                    width:
                      holding.portfolioWeight === "67%"
                        ? "67%"
                        : holding.portfolioWeight === "10%"
                          ? "10%"
                          : holding.portfolioWeight === "9%"
                            ? "9%"
                            : holding.portfolioWeight === "8%"
                              ? "8%"
                              : "4%",
                  }}
                />
              </div>

              <p className="mt-5 leading-7 text-slate-600">
                Allocation guidance will be compared with the selected risk
                profile, financial target and total portfolio concentration.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Next Decision
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Investment OS Recommendation
            </h2>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/10 p-6">
              <div>
                <p className="text-sm text-slate-400">Current stance</p>
                <p className="mt-2 text-3xl font-bold">{holding.stance}</p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-slate-950">
                →
              </div>
            </div>

            <p className="mt-6 leading-7 text-slate-300">
              The final recommendation will combine price data, analyst
              revisions, macro conditions, portfolio allocation and your
              personal investment target.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  positive,
}: {
  label: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  const valueStyle =
    positive === undefined
      ? "text-slate-900"
      : positive
        ? "text-emerald-600"
        : "text-red-600";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${valueStyle}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function InsightCard({
  title,
  label,
  items,
  icon,
  risk = false,
}: {
  title: string;
  label: string;
  items: string[];
  icon: string;
  risk?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${
          risk
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <span
              className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                risk ? "bg-red-500" : "bg-blue-500"
              }`}
            />
            <p className="leading-6 text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}