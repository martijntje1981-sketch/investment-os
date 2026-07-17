"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Check,
  FileImage,
  FileSpreadsheet,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type ImportRow = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  assetType: "investment" | "cash";
  confidence?: number;
  warnings?: string[];
  isin?: string | null;
  exchange?: string | null;
};
type StoredHolding = ImportRow & { currency: "EUR" };
type RecognizedHolding = {
  name: string;
  ticker: string;
  quantity: number;
  price?: number;
  value?: number;
  currency?: string;
  confidence?: number;
  isin?: string | null;
  exchange?: string | null;
  assetType?: "investment" | "cash";
  warnings?: string[];
};
type AnalysisResponse = {
  success: boolean;
  holdings?: RecognizedHolding[];
  message?: string;
};

const HOLDINGS_KEY = "investment-os-holdings";

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const clean = value.replace(/[€$£\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedRecord(record: Record<string, unknown>) {
  return new Map(
    Object.entries(record).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value,
    ]),
  );
}

function firstValue(record: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record.has(key)) return record.get(key);
  }
  return undefined;
}

function parseSpreadsheet(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });

  return records.map((raw) => {
    const record = normalizedRecord(raw);
    const rawSymbol = String(firstValue(record, ["symbol", "ticker", "code", "isin"]) ?? "").trim().toUpperCase();
    const rawName = String(firstValue(record, ["name", "investment", "holding", "security", "description"]) ?? rawSymbol).trim();
    const rawType = String(firstValue(record, ["type", "assettype", "category"]) ?? "").toLowerCase();
    const isCash = rawType.includes("cash") || ["CASH", "EUR", "EURCASH"].includes(rawSymbol.replace(/\s/g, ""));
    const amount = numberValue(firstValue(record, ["amount", "cash", "value", "marketvalue"]));
    const quantity = isCash ? amount || numberValue(firstValue(record, ["quantity", "units", "shares", "number"])) : numberValue(firstValue(record, ["quantity", "units", "shares", "number"]));
    const purchasePrice = isCash ? 1 : numberValue(firstValue(record, ["purchaseprice", "averageprice", "avgprice", "costprice", "buyprice"]));
    const currentPrice = isCash ? 1 : numberValue(firstValue(record, ["currentprice", "price", "marketprice", "lastprice"])) || purchasePrice;

    return {
      id: crypto.randomUUID(),
      symbol: isCash ? rawSymbol || "EUR" : rawSymbol,
      name: isCash ? rawName || "EUR Cash" : rawName,
      quantity,
      purchasePrice,
      currentPrice,
      assetType: isCash ? ("cash" as const) : ("investment" as const),
    };
  }).filter((row) => row.name && row.quantity >= 0 && (row.assetType === "cash" || row.symbol));
}

function readStoredHoldings(): StoredHolding[] {
  try {
    const stored = localStorage.getItem(HOLDINGS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function UploadPage() {
  const router = useRouter();
  const imageInput = useRef<HTMLInputElement>(null);
  const sheetInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"screenshot" | "spreadsheet" | null>(null);

  async function processScreenshot(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The selected image is larger than 10 MB.");
      return;
    }
    setError("");
    setMessage("Analysing screenshot…");
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analyze-portfolio", { method: "POST", body: formData });
      const data = await response.json() as AnalysisResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "The screenshot could not be analysed.");
      const imported = (data.holdings ?? []).map((holding) => {
        const isCash = holding.assetType === "cash";
        const price = holding.price ?? (holding.quantity > 0 && holding.value ? holding.value / holding.quantity : 0);
        return {
          id: crypto.randomUUID(),
          symbol: isCash ? holding.ticker.trim().toUpperCase() || holding.currency || "EUR" : holding.ticker.trim().toUpperCase(),
          name: isCash ? holding.name || `${holding.currency || "EUR"} Cash` : holding.name,
          quantity: holding.quantity,
          purchasePrice: isCash ? 1 : price,
          currentPrice: isCash ? 1 : price,
          assetType: isCash ? "cash" as const : "investment" as const,
          confidence: holding.confidence,
          warnings: holding.warnings,
          isin: holding.isin,
          exchange: holding.exchange,
        };
      });
      if (!imported.length) throw new Error("No holdings were recognised. Try a clearer screenshot.");
      setRows(imported);
      setSource("screenshot");
      setMessage("Review every recognised value before saving.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The screenshot could not be analysed.");
      setMessage("");
    } finally {
      setIsProcessing(false);
    }
  }

  async function processSpreadsheet(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      setError("Choose an Excel (.xlsx or .xls) or CSV file.");
      return;
    }
    setError("");
    setIsProcessing(true);
    setMessage("Reading spreadsheet…");
    try {
      const imported = parseSpreadsheet(await file.arrayBuffer());
      if (!imported.length) throw new Error("No valid holdings were found. Check the column headings and values.");
      setRows(imported);
      setSource("spreadsheet");
      setMessage("Review the imported rows before saving.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The spreadsheet could not be read.");
      setMessage("");
    } finally {
      setIsProcessing(false);
    }
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processScreenshot(file);
    event.target.value = "";
  }

  function onSheetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processSpreadsheet(file);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) void processScreenshot(file);
    else void processSpreadsheet(file);
  }

  function updateRow(id: string, field: keyof ImportRow, value: string) {
    setRows((current) => current.map((row) => row.id === id ? {
      ...row,
      [field]: ["quantity", "purchasePrice", "currentPrice"].includes(field) ? Number(value) : value,
      ...(field === "assetType" && value === "cash" ? { symbol: "EUR", name: "EUR Cash", purchasePrice: 1, currentPrice: 1 } : {}),
    } : row));
  }

  function save(mode: "replace" | "merge") {
    const invalid = rows.some((row) => !row.name.trim() || row.quantity < 0 || (row.assetType === "investment" && (!row.symbol.trim() || row.currentPrice <= 0)));
    if (invalid) {
      setError("Complete all required fields and ensure quantities and prices are valid.");
      return;
    }
    const prepared: StoredHolding[] = rows.map((row) => ({
      ...row,
      symbol: row.symbol.trim().toUpperCase(),
      name: row.name.trim(),
      purchasePrice: row.assetType === "cash" ? 1 : row.purchasePrice,
      currentPrice: row.assetType === "cash" ? 1 : row.currentPrice,
      currency: "EUR",
    }));
    const next = mode === "replace" ? prepared : [...readStoredHoldings(), ...prepared];
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("investment-os-holdings-updated"));
    router.push("/portfolio");
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Secure portfolio setup</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Import your portfolio</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">Choose a screenshot, Excel, CSV or manual entry. Nothing is saved until you review and confirm it.</p>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <ImportCard icon={<FileImage className="h-6 w-6" />} title="Screenshot" text="AI recognises visible positions." button="Choose screenshot" onClick={() => imageInput.current?.click()} />
            <ImportCard icon={<FileSpreadsheet className="h-6 w-6" />} title="Excel or CSV" text="Import rows from a spreadsheet." button="Choose spreadsheet" onClick={() => sheetInput.current?.click()} />
            <ImportCard icon={<Pencil className="h-6 w-6" />} title="Manual entry" text="Add investments or cash yourself." button="Open portfolio" href="/portfolio" />
          </section>

          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} className="hidden" />
          <input ref={sheetInput} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={onSheetChange} className="hidden" />

          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`mt-5 rounded-2xl border-2 border-dashed px-5 py-5 text-center text-sm font-semibold ${isDragging ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-500"}`}
          >
            Drop a screenshot, Excel or CSV file here
          </div>

          {isProcessing && <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}
          {error && <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

          {rows.length > 0 && !isProcessing && (
            <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Review required</p><h2 className="mt-1 text-2xl font-black">Check {rows.length} imported rows</h2><p className="mt-1 text-sm text-slate-500">Source: {source === "screenshot" ? "AI screenshot recognition" : "spreadsheet"}</p></div>
                <button onClick={() => setRows((current) => [...current, { id: crypto.randomUUID(), symbol: "", name: "", quantity: 0, purchasePrice: 0, currentPrice: 0, assetType: "investment" }])} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold"><Plus className="h-4 w-4" /> Add row</button>
              </div>

              <div className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <div key={row.id} className="grid gap-3 px-5 py-5 md:grid-cols-[0.8fr_0.8fr_1.4fr_0.8fr_0.9fr_0.9fr_auto] md:items-end md:px-7">
                    <ReviewField label="Type"><select value={row.assetType} onChange={(event) => updateRow(row.id, "assetType", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold"><option value="investment">Investment</option><option value="cash">Cash</option></select></ReviewField>
                    <ReviewField label="Symbol"><input disabled={row.assetType === "cash"} value={row.symbol} onChange={(event) => updateRow(row.id, "symbol", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold disabled:opacity-60" /></ReviewField>
                    <ReviewField label="Name"><input value={row.name} onChange={(event) => updateRow(row.id, "name", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold" />{((row.confidence ?? 1) < 0.8 || (row.warnings?.length ?? 0) > 0) && <p className="mt-1.5 text-[11px] font-semibold leading-4 text-amber-700">{row.warnings?.join(" · ") || "Low-confidence recognition — verify this row carefully."}</p>}</ReviewField>
                    <ReviewField label={row.assetType === "cash" ? "Amount" : "Quantity"}><input type="number" min="0" step="any" value={row.quantity} onChange={(event) => updateRow(row.id, "quantity", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold" /></ReviewField>
                    <ReviewField label="Purchase price"><input disabled={row.assetType === "cash"} type="number" min="0" step="any" value={row.purchasePrice} onChange={(event) => updateRow(row.id, "purchasePrice", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold disabled:opacity-60" /></ReviewField>
                    <ReviewField label="Current price"><input disabled={row.assetType === "cash"} type="number" min="0" step="any" value={row.currentPrice} onChange={(event) => updateRow(row.id, "currentPrice", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold disabled:opacity-60" /></ReviewField>
                    <button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Remove ${row.name || "row"}`} className="rounded-lg p-2.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
                <button onClick={() => save("merge")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold">Add to existing portfolio</button>
                <button onClick={() => save("replace")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"><Check className="h-4 w-4" /> Replace portfolio</button>
              </div>
            </section>
          )}

          <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-white/10 p-3"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-black">You stay in control</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Investment OS never asks for your broker password. Imported and AI-recognised values must be reviewed before they are saved.</p></div></div>
          </section>
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}

function ImportCard({ icon, title, text, button, onClick, href }: { icon: React.ReactNode; title: string; text: string; button: string; onClick?: () => void; href?: string }) {
  const classes = "mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white";
  return <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>{href ? <Link href={href} className={classes}>{button}</Link> : <button onClick={onClick} className={classes}>{button}</button>}</article>;
}

function ReviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</span>{children}</label>;
}