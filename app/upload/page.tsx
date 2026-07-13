"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  FileImage,
  LockKeyhole,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type RecognizedHolding = {
  name: string;
  ticker: string;
  quantity: number;
  price?: number;
  value?: number;
  currency?: string;
  confidence?: number;
};

type AnalysisResponse = {
  success: boolean;
  holdings?: RecognizedHolding[];
  broker?: string;
  message?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusType, setStatusType] = useState<
    "success" | "error" | "info" | null
  >(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [recognizedHoldings, setRecognizedHoldings] = useState<
    RecognizedHolding[]
  >([]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function resetStatus() {
    setStatusType(null);
    setStatusMessage("");
    setRecognizedHoldings([]);
  }

  function processFile(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setStatusType("error");
      setStatusMessage("Selecteer een JPG-, PNG- of WEBP-afbeelding.");
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      setStatusType("error");
      setStatusMessage("De geselecteerde afbeelding is groter dan 10 MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    resetStatus();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget === event.target) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function removeFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setIsProcessing(false);
    resetStatus();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function analysePortfolio() {
    if (!selectedFile) {
      setStatusType("error");
      setStatusMessage("Upload eerst een screenshot van je portefeuille.");
      return;
    }

    setIsProcessing(true);
    setStatusType("info");
    setStatusMessage("Screenshot wordt geanalyseerd…");
    setRecognizedHoldings([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/analyze-portfolio", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as AnalysisResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "De screenshot kon niet worden geanalyseerd."
        );
      }

      const holdings = data.holdings ?? [];

      if (holdings.length === 0) {
        throw new Error(
          "Er zijn geen holdings gevonden. Probeer een scherpere screenshot."
        );
      }

      const portfolioImport = {
        broker: data.broker || "Unknown broker",
        importedAt: new Date().toISOString(),
        holdings,
      };

      localStorage.setItem(
        "investment-os-imported-portfolio",
        JSON.stringify(portfolioImport)
      );

      setRecognizedHoldings(holdings);
      setStatusType("success");
      setStatusMessage(
        `${holdings.length} holding${
          holdings.length === 1 ? "" : "s"
        } succesvol herkend. Je wordt doorgestuurd naar Portfolio.`
      );

      window.setTimeout(() => {
        router.push("/portfolio");
      }, 1800);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Er is een onbekende fout opgetreden.";

      setStatusType("error");
      setStatusMessage(message);
    } finally {
      setIsProcessing(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatNumber(value?: number) {
    if (value === undefined || Number.isNaN(value)) {
      return "—";
    }

    return new Intl.NumberFormat("nl-NL", {
      maximumFractionDigits: 4,
    }).format(value);
  }

  function formatMoney(value?: number, currency = "EUR") {
    if (value === undefined || Number.isNaN(value)) {
      return "—";
    }

    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1120px] px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-10 sm:px-8 sm:pt-14">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            <LockKeyhole className="h-4 w-4" />
            Secure portfolio setup
          </div>

          <h1 className="mt-5 max-w-[760px] text-[36px] font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-[48px]">
            Import your portfolio
          </h1>

          <p className="mt-4 max-w-[700px] text-base leading-7 text-slate-600 sm:text-lg">
            Upload een screenshot van je broker. Investment OS herkent je
            holdings en zet ze automatisch klaar voor je portfolio.
          </p>
        </section>

        <section className="mt-9 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-600">
                    Recommended
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                    Upload a screenshot
                  </h2>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  JPG · PNG · WEBP
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {!selectedFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openFilePicker();
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-6 py-12 text-center transition ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Upload className="h-8 w-8" />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-slate-950">
                    Drop your portfolio screenshot here
                  </h3>

                  <p className="mt-2 max-w-[430px] text-sm leading-6 text-slate-500">
                    Selecteer een duidelijke screenshot waarop de namen,
                    aantallen en waardes van je beleggingen zichtbaar zijn.
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openFilePicker();
                    }}
                    className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Choose screenshot
                  </button>

                  <p className="mt-4 text-xs text-slate-400">
                    Maximum file size: 10 MB
                  </p>
                </div>
              ) : (
                <div>
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                          <FileImage className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {selectedFile.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeFile}
                        disabled={isProcessing}
                        aria-label="Remove uploaded screenshot"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {previewUrl && (
                      <div className="flex min-h-[330px] items-center justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Uploaded portfolio screenshot preview"
                          className="max-h-[520px] w-auto max-w-full rounded-xl object-contain shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={analysePortfolio}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Analysing screenshot...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Analyze screenshot
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={isProcessing}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Choose another image
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {statusMessage && (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    statusType === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : statusType === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {statusType === "error" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <span>{statusMessage}</span>
                  </div>
                </div>
              )}

              {recognizedHoldings.length > 0 && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">
                      Recognized holdings
                    </p>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {recognizedHoldings.map((holding, index) => (
                      <div
                        key={`${holding.ticker}-${index}`}
                        className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {holding.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {holding.ticker || "Ticker onbekend"} ·{" "}
                            {formatNumber(holding.quantity)} stuks
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatMoney(
                              holding.value,
                              holding.currency || "EUR"
                            )}
                          </p>

                          {holding.confidence !== undefined && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {Math.round(holding.confidence * 100)}% confidence
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                How it works
              </h2>

              <div className="mt-5 space-y-4">
                {[
                  "Upload your broker screenshot",
                  "AI recognizes your holdings",
                  "Review the detected positions",
                  "Portfolio and dashboard are updated",
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                      {index + 1}
                    </div>

                    <p className="pt-1 text-sm font-medium text-slate-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h2 className="mt-5 text-xl font-bold">
                Your portfolio data stays yours.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Investment OS vraagt nooit om je brokerwachtwoord. De
                screenshot wordt alleen gebruikt om je posities te herkennen.
              </p>

              <div className="mt-5 space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  No broker login required
                </div>

                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Holdings stored in your browser
                </div>

                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Replace your portfolio anytime
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}