export type RiskLevel = "Medium" | "High" | "Very High";
export type HoldingStance = "Hold" | "Core Holding" | "Growth Holding" | "Accumulate Carefully" | "Income Holding" | "Defensive Holding";

export type Holding = {
  ticker: string;
  slug: string;
  name: string;
  category: string;
  units: number;
  averagePrice: number;
  currentPrice: number;
  dailyChangePercent: number;
  investmentScore: number;
  stance: HoldingStance;
  riskLevel: RiskLevel;
  summary: string;
  thesis: string[];
  catalysts: string[];
  risks: string[];
};

export type HoldingSnapshot = Holding & {
  costBasis: number;
  marketValue: number;
  profitLoss: number;
  returnPercent: number;
  weightPercent: number;
  dailyChangeValue: number;
};

export type PortfolioSnapshot = {
  holdings: HoldingSnapshot[];
  totalValue: number;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalReturnPercent: number;
  dailyChangeValue: number;
  dailyChangePercent: number;
  largestHolding: HoldingSnapshot;
};
