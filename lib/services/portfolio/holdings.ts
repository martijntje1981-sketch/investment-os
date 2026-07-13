export type Holding = {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  category: string;

  units: number;
  averagePrice: number;
  currentPrice: number;

  currency: "EUR";

  investmentScore: number;
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
    currency: "EUR",
    investmentScore: 8.4,
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
    currency: "EUR",
    investmentScore: 8.9,
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
    currency: "EUR",
    investmentScore: 8.8,
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
    currency: "EUR",
    investmentScore: 8.1,
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
    currency: "EUR",
    investmentScore: 9.2,
  },

  {
    id: "ppfb",
    ticker: "PPFB",
    symbol: "PPFB",
    name: "Physical Gold ETC",
    category: "Gold",
    units: 200,
    averagePrice: 10.00,
    currentPrice: 10.00,
    currency: "EUR",
    investmentScore: 7.8,
  },
];