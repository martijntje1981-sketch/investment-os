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
    averagePrice: 7.03,
    currentPrice: 5.16,
    dailyChangePercent: -1.19,
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
    id: "vwce",
    ticker: "VWCE",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World ETF",
    category: "Global Equity",
    units: 69,
    averagePrice: 128.99,
    currentPrice: 128.99,
    dailyChangePercent: 0.18,
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

  {
    id: "nukl",
    ticker: "NUKL",
    symbol: "NUKL",
    name: "VanEck Uranium & Nuclear ETF",
    category: "Thematic",
    units: 161,
    averagePrice: 46.58,
    currentPrice: 46.58,
    dailyChangePercent: 0.42,
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
    id: "strc",
    ticker: "STRC",
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    category: "Income",
    units: 450,
    averagePrice: 15.56,
    currentPrice: 15.56,
    dailyChangePercent: 0.04,
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
    name: "AI Infrastructure ETF",
    category: "AI",
    units: 520,
    averagePrice: 10.19,
    currentPrice: 10.19,
    dailyChangePercent: 0.61,
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
    id: "ppfb",
    ticker: "PPFB",
    symbol: "PPFB",
    name: "Physical Gold ETC",
    category: "Gold",
    units: 200,
    averagePrice: 10.0,
    currentPrice: 10.0,
    dailyChangePercent: 0.15,
    currency: "EUR",
    investmentScore: 7.8,
    stance: "Defensive Holding",
    riskLevel: "Low",
    summary:
      "PPFB provides defensive exposure to physical gold and acts as a portfolio stabiliser during periods of market stress or monetary uncertainty.",
    thesis: [
      "Gold can provide protection during periods of inflation or financial instability.",
      "It has historically shown a low correlation with many risk assets.",
      "Central-bank demand supports the long-term investment case.",
    ],
    catalysts: [
      "Falling real interest rates.",
      "Continued central-bank gold purchases.",
      "Higher geopolitical or financial-market uncertainty.",
    ],
    risks: [
      "Gold does not generate income.",
      "Higher real interest rates can reduce investor demand.",
      "The price may underperform during strong risk-on equity markets.",
    ],
  },
];