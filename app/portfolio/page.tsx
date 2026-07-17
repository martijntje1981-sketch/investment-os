"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import { holdings as portfolioHoldings } from "@/lib/services/portfolio/holdings";

type AssetType = "investment" | "cash";
type Holding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: "EUR";
  assetType: AssetType;
};
type CachedPrice = {
  symbol: string;
  price: number;
  changePercent?: number;
  updatedAt?: string;
};
type PriceResult = {
  symbol: string;
  priceEur: number;
  changePercent?: number;
  updatedAt?: string;
};

const HOLDINGS_KEY = "investment-os-holdings";
const PRICE_CACHE_KEY = "investment-os-market-price-cache";

const defaultHoldings: Holding[] = portfolioHoldings.map((holding) => ({
  id: holding.id,
  symbol: holding.symbol.trim().toUpperCase(),
  name: holding.name,
  quantity: holding.units,
  purchasePrice: holding.averagePrice,
  currentPrice: holding.currentPrice,
  currency: "EUR",
  assetType: "investment",
}));

const emptyDraft: Holding = {
  id: "",
  symbol: "",
  name: "",
  quantity: 0,
  purchasePrice: 0,
  currentPrice: 0,
  currency: "EUR",
  assetType: "investment",
};

function money(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function valueOf(holding: Holding) {
  return holding.quantity * holding.currentPrice;
}

function costOf(holding: Holding) {
  return holding.quantity * holding.purchasePrice;
}

function validHoldings(value: unknown): value is Holding[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const holding = item as Partial<Holding>;
    return typeof holding.id === "string" &&
      typeof holding.symbol === "string" &&
      typeof holding.name === "string" &&
      typeof holding.quantity === "number" &&
      typeof holding.purchasePrice === "number" &&
      typeof holding.currentPrice === "number";
  });
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(defaultHoldings);
  const [draft, setDraft] = useState<Holding>(emptyDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("Portfolio prices use the latest available market data.");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HOLDINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (validHoldings(parsed)) {
          setHoldings(parsed.map((holding) => ({
            ...holding,
            assetType: holding.assetType === "cash" ? "cash" : "investment",
          })));
          return;
        }
      }
      localStorage.setItem(HOLDINGS_KEY, JSON.stringify(defaultHoldings));
    } catch {
      setHoldings(defaultHoldings);
    }
  }, []);

  const saveHoldings = useCallback((next: Holding[]) => {
    setHoldings(next);
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("investment-os-holdings-updated"));
  }, []);

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/prices", { cache: "no-store" });
      const data = await response.json() as { success?: boolean; prices?: PriceResult[]; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "Market data unavailable");

      const prices = new Map(
        (data.prices ?? [])
          .filter((price) => Number.isFinite(price.priceEur) && price.priceEur > 0)
          .map((price) => [price.symbol.trim().toUpperCase(), price]),
      );
      const next = holdings.map((holding) => {
        if (holding.assetType === "cash") return holding;
        const quote = prices.get(holding.symbol);
        return quote ? { ...holding, currentPrice: quote.priceEur } : holding;
      });
      const cache: CachedPrice[] = [...prices.values()].map((quote) => ({
        symbol: quote.symbol.trim().toUpperCase(),
        price: quote.priceEur,
        changePercent: quote.changePercent,
        updatedAt: quote.updatedAt,
      }));
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
      saveHoldings(next);
      setMessage(`${prices.size} market prices updated. Cash remains fixed at its entered value.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Market data unavailable. Stored values remain visible.");
    } finally {
      setIsRefreshing(false);
    }
  }, [holdings, saveHoldings]);

  const totalValue = useMemo(() => holdings.reduce((sum, holding) => sum + valueOf(holding), 0), [holdings]);
  const investedCost = useMemo(() => holdings.reduce((sum, holding) => sum + costOf(holding), 0), [holdings]);
  const totalReturn = totalValue - investedCost;
  const totalReturnPercent = investedCost > 0 ? totalReturn / investedCost * 100 : 0;
  const cashValue = holdings.filter((holding) => holding.assetType === "cash").reduce((sum, holding) => sum + valueOf(holding), 0);
  const largest = [...holdings].sort((a, b) => valueOf(b) - valueOf(a))[0];

  function openAdd(assetType: AssetType) {
    setDraft({
      ...emptyDraft,
      id: crypto.randomUUID(),
      assetType,
      symbol: assetType === "cash" ? "EUR" : "",
      name: assetType === "cash" ? "EUR Cash" : "",
      purchasePrice: assetType === "cash" ? 1 : 0,
      currentPrice: assetType === "cash" ? 1 : 0,
    });
    setEditorOpen(true);
  }

  function openEdit(holding: Holding) {
    setDraft({ ...holding });
    setEditorOpen(true);
  }

  function submitHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned: Holding = draft.assetType === "cash"
      ? { ...draft, symbol: draft.symbol || "EUR", name: draft.name || "EUR Cash", purchasePrice: 1, currentPrice: 1 }
      : { ...draft, symbol: draft.symbol.trim().toUpperCase(), name: draft.name.trim() };
    const exists = holdings.some((holding) => holding.id === cleaned.id);
    saveHoldings(exists
      ? holdings.map((holding) => holding.id === cleaned.id ? cleaned : holding)
      : [...holdings, cleaned]);
    setEditorOpen(false);
  }

  function removeHolding(holding: Holding) {
    if (!window.confirm(`Remove ${holding.name} from your portfolio?`)) return;
    saveHoldings(holdings.filter((item) => item.id !== holding.id));
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Portfolio</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Your investments</h1>
              <p className="mt-4 max-w-2xl leading-7 text-slate-600">Manage investments and cash from one clear overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void refreshPrices()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh prices
              </button>
              <button onClick={() => openAdd("cash")} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold">
                <Banknote className="h-4 w-4" /> Add cash
              </button>
              <button onClick={() => openAdd("investment")} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                <Plus className="h-4 w-4" /> Add investment
              </button>
            </div>
          </header>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<CircleDollarSign className="h-5 w-5" />} label="Total value" value={money(totalValue)} />
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Since purchase" value={`${totalReturn >= 0 ? "+" : ""}${money(totalReturn)}`} detail={percent(totalReturnPercent)} tone={totalReturn >= 0 ? "positive" : "negative"} />
            <Metric icon={<Banknote className="h-5 w-5" />} label="Cash" value={money(cashValue)} detail={totalValue > 0 ? `${(cashValue / totalValue * 100).toFixed(1)}% of portfolio` : "0.0% of portfolio"} />
            <Metric icon={<PieChart className="h-5 w-5" />} label="Largest position" value={largest?.symbol ?? "—"} detail={largest && totalValue > 0 ? `${(valueOf(largest) / totalValue * 100).toFixed(1)}% of portfolio` : "No holdings"} />
          </section>

          <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-xl font-black">Holdings</h2>
                <p className="mt-1 text-sm text-slate-500">{holdings.length} positions</p>
              </div>
              <Link href="/upload" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><Upload className="h-4 w-4" /> Import</Link>
            </div>

            {holdings.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-xl font-black">No holdings yet</h3>
                <p className="mt-2 text-sm text-slate-500">Add an investment, cash position or import your portfolio.</p>
                <button onClick={() => openAdd("investment")} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Add first holding</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {holdings.map((holding) => {
                  const holdingValue = valueOf(holding);
                  const holdingReturn = holdingValue - costOf(holding);
                  const allocation = totalValue > 0 ? holdingValue / totalValue * 100 : 0;
                  return (
                    <article key={holding.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[0.65fr_1.5fr_1fr_0.8fr_1fr_auto] lg:items-center lg:px-7">
                      <div><span className={`inline-flex rounded-xl px-3 py-2 text-sm font-black ${holding.assetType === "cash" ? "bg-emerald-100 text-emerald-800" : "bg-slate-950 text-white"}`}>{holding.symbol}</span></div>
                      <div>
                        <p className="font-black">{holding.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{holding.assetType === "cash" ? "Cash holding" : `${holding.quantity.toLocaleString("en-GB")} units`}</p>
                      </div>
                      <div><p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Value</p><p className="font-black">{money(holdingValue)}</p></div>
                      <div><p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Allocation</p><p className="font-bold">{allocation.toFixed(1)}%</p></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Return</p>
                        <p className={`font-bold ${holdingReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}>{holding.assetType === "cash" ? "Stable" : `${holdingReturn >= 0 ? "+" : ""}${money(holdingReturn)}`}</p>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {holding.assetType === "investment" && <Link href={`/holding/${holding.symbol}`} aria-label={`View ${holding.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></Link>}
                        <button onClick={() => openEdit(holding)} aria-label={`Edit ${holding.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeHolding(holding)} aria-label={`Remove ${holding.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-300"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Portfolio insight</p>
                <p className="mt-3 max-w-3xl leading-7 text-slate-200">
                  {largest && totalValue > 0 ? `${largest.symbol} is your largest position at ${(valueOf(largest) / totalValue * 100).toFixed(1)}%. ` : ""}
                  {cashValue > 0 && totalValue > 0 ? `Cash represents ${(cashValue / totalValue * 100).toFixed(1)}% of total portfolio value.` : "No cash holding is currently recorded."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <BottomNavigation />

      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <form onSubmit={submitHolding} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px] sm:p-8">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{draft.assetType === "cash" ? "Cash" : "Investment"}</p><h2 className="mt-2 text-2xl font-black">{holdings.some((item) => item.id === draft.id) ? "Edit holding" : "Add holding"}</h2></div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {draft.assetType === "cash" ? (
              <div className="mt-7 space-y-5">
                <Field label="Cash name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
                <Field label="Amount" type="number" prefix="€" min="0" step="0.01" value={draft.quantity} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Symbol" value={draft.symbol} onChange={(value) => setDraft({ ...draft, symbol: value })} />
                  <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
                </div>
                <Field label="Quantity" type="number" min="0" step="any" value={draft.quantity} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Average purchase price" type="number" prefix="€" min="0" step="any" value={draft.purchasePrice} onChange={(value) => setDraft({ ...draft, purchasePrice: Number(value) })} />
                  <Field label="Current price" type="number" prefix="€" min="0" step="any" value={draft.currentPrice} onChange={(value) => setDraft({ ...draft, currentPrice: Number(value) })} />
                </div>
              </div>
            )}

            <button type="submit" className="mt-7 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white">Save holding</button>
          </form>
        </div>
      )}
    </>
  );
}

function Metric({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail?: string; tone?: "neutral" | "positive" | "negative" }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-950"}`}>{value}</p>{detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}</article>;
}

function Field({ label, value, onChange, type = "text", prefix, min, step }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; prefix?: string; min?: string; step?: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-700">{label}</span><span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">{prefix && <span className="font-bold text-slate-400">{prefix}</span>}<input required type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none" /></span></label>;
}