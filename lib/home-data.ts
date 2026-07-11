export const homeData = {
  greeting: "Good morning Martijn 👋",
  status: {
    message: "No action required today.",
    explanation:
      "Your portfolio remains healthy and aligned with your long-term investment strategy.",
  },
  briefing: [
    {
      label: "Bitcoin",
      indicator: "orange" as const,
      text: "Bitcoin remains your strongest long-term position.",
    },
    {
      label: "Portfolio",
      indicator: "green" as const,
      text: "Your allocation is still well balanced.",
    },
    {
      label: "Macro",
      indicator: "blue" as const,
      text: "No major macro events require action today.",
    },
  ],
  investmentScore: {
    score: 91,
    badge: "Excellent",
    explanation:
      "Strong diversification, consistent contributions, and alignment with your target allocation.",
  },
  portfolio: {
    totalValue: 86000,
    todayChange: 430,
    todayPercent: 0.5,
    bestHolding: { name: "Bitcoin", change: 2.1 },
    worstHolding: { name: "Vanguard FTSE All-World", change: -0.3 },
  },
  goal: {
    target: 1000000,
    current: 86000,
    progress: 8.6,
    yearsRemaining: 21,
  },
  events: [
    { when: "Tomorrow", title: "US CPI", description: "Inflation data release" },
    {
      when: "Next week",
      title: "Fed Meeting",
      description: "Interest rate decision",
    },
    {
      when: "Monthly",
      title: "Portfolio Review",
      description: "Scheduled allocation check",
    },
  ],
};

export function formatEuro(value: number, options?: { signed?: boolean }) {
  const formatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  if (options?.signed && value > 0) return `+${formatted}`;
  if (options?.signed && value < 0) return `-${formatted}`;
  return formatted;
}

export function formatPercent(value: number, signed = false) {
  const prefix = signed && value > 0 ? "+" : signed && value < 0 ? "" : "";
  return `${prefix}${value.toFixed(1)}%`;
}
