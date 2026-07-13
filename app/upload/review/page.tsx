"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type Holding = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: "EUR" | "USD" | "GBP";
  confidence: "High" | "Medium" | "Low";
};

const initialHoldings: Holding[] = [
  {
    id: 1,
    symbol: "IB1T",
    name: "iShares Bitcoin ETP",
    quantity: 11269,
    purchasePrice: 5.16,
    currentPrice: 5.16,
    currency: "EUR",
    confidence: "High",
  },
  {
    id: 2,
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    quantity: 450,
    purchasePrice: 15.56,
    currentPrice: 15.56,
    currency: "EUR",
    confidence: "High",
  },
  {
    id: 3,
    symbol: "VWCE",
    name: "Vanguard FTSE All-World ETF",
    quantity: 99,
    purchasePrice: 87.88,
    currentPrice: 87.88,
    currency: "EUR",
    confidence: "High",
  },
  {
    id: 4,
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies ETF",
    quantity: 161,
    purchasePrice: 46.58,
    currentPrice: 46.58,
    currency: "EUR",
    confidence: "Medium",
  },
  {
    id: 5,
    symbol: "AIFS",
    name: "AI Infrastructure ETF",
    quantity: 520,
    purchasePrice: 10.19,
    currentPrice: 10.19,
    currency: "EUR",
    confidence: "Medium",
  },
  {
    id: 6,
    symbol: "PPFB",
    name: "iShares Physical Gold ETC",
    quantity: 200,
    purchasePrice: 10,
    currentPrice: 10,
    currency: "EUR",
    confidence: "High",
  },
];

function formatCurrency(value: number, currency: Holding["currency"]) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getConfidenceClasses(confidence: Holding["confidence"]) {
  if (confidence === "High") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (confidence === "Medium") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default function PortfolioReviewPage() {
  const router = useRouter();

  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce(
      (total, holding) => total + holding.quantity * holding.currentPrice,
      0
    );
  }, [holdings]);

  function updateHolding(
    id: number,
    field: keyof Holding,
    value: string | number
  ) {
    setHoldings((currentHoldings) =>
      currentHoldings.map((holding) => {
        if (holding.id !== id) {
          return holding;
        }

        if (
          field === "quantity" ||
          field === "purchasePrice" ||
          field === "currentPrice"
        ) {
          const parsedValue =
            typeof value === "number"
              ? value
              : Number(value.replace(",", "."));

          return {
            ...holding,
            [field]: Number.isNaN(parsedValue) ? 0 : parsedValue,
          };
        }

        return {
          ...holding,
          [field]: value,
        };
      })
    );
  }

  function removeHolding(id: number) {
    setHoldings((currentHoldings) =>
      currentHoldings.filter((holding) => holding.id !== id)
    );
  }

  function addHolding() {
    const newHolding: Holding = {
      id: Date.now(),
      symbol: "",
      name: "",
      quantity: 0,
      purchasePrice: 0,
      currentPrice: 0,
      currency: "EUR",
      confidence: "Low",
    };

    setHoldings((currentHoldings) => [...currentHoldings, newHolding]);
  }

  async function savePortfolio() {
    const invalidHolding = holdings.some(
      (holding) =>
        !holding.symbol.trim() ||
        holding.quantity <= 0 ||
        holding.currentPrice <= 0
    );

    if (invalidHolding) {
      setStatusMessage(
        "Check the portfolio. Every holding needs a symbol, quantity and current price."
      );
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    localStorage.setItem("investment-os-portfolio", JSON.stringify(holdings));

    await new Promise((resolve) => setTimeout(resolve, 900));

    setIsSaving(false);
    router.push("/portfolio");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1180px] px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-8 sm:px-8 sm:pt-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to upload
        </button>

        <section className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Screenshot analysed
            </div>

            <h1 className="mt-5 text-[34px] font-bold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[46px]">
              Review your portfolio
            </h1>

            <p className="mt-3 max-w-[680px] text-base leading-7 text-slate-600">
              Check the detected holdings carefully. You can change every
              field before the portfolio is saved.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Detected portfolio value
            </p>

            <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {formatCurrency(totalPortfolioValue, "EUR")}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Based on the prices shown below
            </p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
                Detected holdings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {holdings.length} holdings found
              </p>
            </div>

            <button
              type="button"
              onClick={addHolding}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add holding
            </button>
          </div>

          <div className="hidden grid-cols-[0.7fr_1.7fr_0.8fr_0.9fr_0.9fr_0.8fr_0.45fr] gap-4 border-b border-slate-200 bg-slate-50 px-7 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:grid">
            <span>Symbol</span>
            <span>Investment</span>
            <span>Quantity</span>
            <span>Purchase price</span>
            <span>Current price</span>
            <span>Confidence</span>
            <span />
          </div>

          <div className="divide-y divide-slate-200">
            {holdings.map((holding) => {
              const holdingValue =
                holding.quantity * holding.currentPrice;

              return (
                <div
                  key={holding.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[0.7fr_1.7fr_0.8fr_0.9fr_0.9fr_0.8fr_0.45fr] lg:items-center lg:px-7"
                >
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Symbol
                    </span>

                    <input
                      type="text"
                      value={holding.symbol}
                      onChange={(event) =>
                        updateHolding(
                          holding.id,
                          "symbol",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="Ticker"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold uppercase text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <div>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                        Investment
                      </span>

                      <input
                        type="text"
                        value={holding.name}
                        onChange={(event) =>
                          updateHolding(
                            holding.id,
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="Investment name"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <p className="mt-1.5 text-xs font-medium text-slate-500">
                      Value:{" "}
                      {formatCurrency(holdingValue, holding.currency)}
                    </p>
                  </div>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Quantity
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={holding.quantity}
                      onChange={(event) =>
                        updateHolding(
                          holding.id,
                          "quantity",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Purchase price
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={holding.purchasePrice}
                        onChange={(event) =>
                          updateHolding(
                            holding.id,
                            "purchasePrice",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-12 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {holding.currency}
                      </span>
                    </div>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Current price
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={holding.currentPrice}
                        onChange={(event) =>
                          updateHolding(
                            holding.id,
                            "currentPrice",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-12 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {holding.currency}
                      </span>
                    </div>
                  </label>

                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Confidence
                    </span>

                    <div className="relative">
                      <select
                        value={holding.confidence}
                        onChange={(event) =>
                          updateHolding(
                            holding.id,
                            "confidence",
                            event.target.value as Holding["confidence"]
                          )
                        }
                        className={`w-full appearance-none rounded-xl border-0 px-3 py-2.5 pr-9 text-sm font-bold outline-none ${getConfidenceClasses(
                          holding.confidence
                        )}`}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeHolding(holding.id)}
                    aria-label={`Remove ${holding.symbol || "holding"}`}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 lg:w-11"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {holdings.length === 0 && (
            <div className="px-6 py-16 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-bold text-slate-900">
                No holdings in this portfolio
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add at least one holding before saving.
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
            {statusMessage && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {statusMessage}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <p className="max-w-[580px] text-sm leading-6 text-slate-500">
                This is currently a review prototype. The next step will
                connect these rows to the screenshot recognition service.
              </p>

              <button
                type="button"
                onClick={savePortfolio}
                disabled={isSaving || holdings.length === 0}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save portfolio
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}