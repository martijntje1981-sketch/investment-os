export type HoldingStance =
  | "Core Holding"
  | "Growth Holding"
  | "Defensive Holding"
  | "Hold";

export type Holding = {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  category: string;

  units: number;
  averagePrice: number;
  currentPrice: number;
  dailyChangePercent: number;

  currency: "EUR";

  investmentScore: number;
  stance: HoldingStance;
  riskLevel: "Low" | "Medium" | "High" | "Very High";

  summary: string;
  thesis: string[];
  catalysts: string[];
  risks: string[];
};

export const holdings: Holding[] = [
  {
    id: "ib1t",
    ticker: "IB1T",
    symbol: "IB1T",
    name: "iShares Bitcoin ETP",
    category: "Digital Assets",

    units: 11269,
    averagePrice: 6.969542,

    // Fallback only. EODHD replaces this with the live price.
    currentPrice: 5.477,
    dailyChangePercent: -0.24,

    currency: "EUR",

    investmentScore: 8.4,
    stance: "Core Holding",
    riskLevel: "Very High",

    summary:
      "IB1T is the largest position in the portfolio and provides direct Bitcoin exposure. It remains the main growth engine, but its current portfolio weight creates significant concentration risk.",

    thesis: [
      "Bitcoin has a structurally limited supply.",
      "Institutional adoption continues through regulated investment products.",
      "Bitcoin may benefit from long-term monetary expansion and growing demand for scarce digital assets.",
    ],

    catalysts: [
      "Continued institutional and ETF demand.",
      "Improving global liquidity conditions.",
      "Lower interest rates and renewed investor risk appetite.",
    ],

    risks: [
      "High price volatility and large interim drawdowns.",
      "The position represents a large share of the total portfolio.",
      "Regulatory or market-structure changes could negatively affect demand.",
    ],
  },

  {
    id: "strc",
    ticker: "STRC",
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    category: "Income",

    units: 450,
    averagePrice: 15.581555,

    // Fallback only. EODHD replaces this with the live EUR price.
    currentPrice: 16.044,
    dailyChangePercent: -0.45,

    currency: "EUR",

    investmentScore: 8.1,
    stance: "Hold",
    riskLevel: "High",

    summary:
      "STRC is intended to add portfolio income while retaining indirect exposure to the Bitcoin and digital-asset ecosystem.",

    thesis: [
      "The position may provide an attractive income stream.",
      "It adds a different return profile from direct Bitcoin exposure.",
      "It may help build future portfolio cash flow.",
    ],

    catalysts: [
      "Stable distributions and sustained product demand.",
      "Improving conditions for digital-asset-related investments.",
      "Growth in investor demand for income-producing crypto products.",
    ],

    risks: [
      "Distributions are not guaranteed.",
      "The product structure may be more complex than a traditional ETF.",
      "Performance may remain correlated with Bitcoin-related markets.",
    ],
  },

  {
    id: "aifs",
    ticker: "AIFS",
    symbol: "AIFS",
    name: "iShares AI Infrastructure UCITS ETF",
    category: "AI Infrastructure",

    units: 520,
    averagePrice: 7.780515,

    // Fallback only. EODHD replaces this with the live price.
    currentPrice: 9.6,
    dailyChangePercent: -0.45,

    currency: "EUR",

    investmentScore: 9.2,
    stance: "Growth Holding",
    riskLevel: "High",

    summary:
      "AIFS provides exposure to the infrastructure required for artificial intelligence, including chips, data centres, networking and power systems.",

    thesis: [
      "AI adoption requires substantial investment in physical and digital infrastructure.",
      "Demand for compute capacity, networking and electricity is expected to remain strong.",
      "The position provides exposure to multiple beneficiaries of the AI investment cycle.",
    ],

    catalysts: [
      "Rising capital expenditure by hyperscalers.",
      "Continued demand for semiconductors and data-centre capacity.",
      "New enterprise and consumer AI applications.",
    ],

    risks: [
      "AI-related valuations may become excessive.",
      "Capital expenditure growth could slow.",
      "The sector is sensitive to interest rates and technology cycles.",
    ],
  },

  {
    id: "nukl",
    ticker: "NUKL",
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
    category: "Uranium & Nuclear",

    units: 172,
    averagePrice: 49.318145,

    // Fallback only. EODHD replaces this with the live price.
    currentPrice: 44.14,
    dailyChangePercent: -1.47,

    currency: "EUR",

    investmentScore: 8.8,
    stance: "Growth Holding",
    riskLevel: "High",

    summary:
      "NUKL provides exposure to uranium miners, nuclear technology companies and the long-term revival of nuclear power.",

    thesis: [
      "Electricity demand is increasing due to data centres, electrification and artificial intelligence.",
      "Nuclear energy provides reliable low-carbon baseload power.",
      "Uranium supply may remain constrained relative to future reactor demand.",
    ],

    catalysts: [
      "New nuclear reactor approvals and construction.",
      "Long-term uranium contracting by utilities.",
      "Government support for nuclear energy.",
    ],

    risks: [
      "Uranium equities are cyclical and volatile.",
      "Political opposition can delay nuclear projects.",
      "Commodity prices may decline if expected demand does not materialise.",
    ],
  },

  {
    id: "vwce",
    ticker: "VWCE",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    category: "Global Equity",

    units: 38,
    averagePrice: 153.514285,

    // Fallback only. EODHD replaces this with the live price.
    currentPrice: 165.12,
    dailyChangePercent: -0.27,

    currency: "EUR",

    investmentScore: 8.9,
    stance: "Core Holding",
    riskLevel: "Medium",

    summary:
      "VWCE provides broad global equity diversification across developed and emerging markets. It is the most balanced core position in the portfolio.",

    thesis: [
      "Broad exposure reduces company-specific and sector-specific risk.",
      "Global equities have historically benefited from economic growth and corporate earnings expansion.",
      "The fund provides a stable foundation alongside higher-risk thematic positions.",
    ],

    catalysts: [
      "Global earnings growth.",
      "Lower inflation and falling interest rates.",
      "Continued long-term economic expansion.",
    ],

    risks: [
      "Global equity markets can experience prolonged drawdowns.",
      "US mega-cap companies represent a significant part of the index.",
      "Currency movements may affect euro-denominated returns.",
    ],
  },
];