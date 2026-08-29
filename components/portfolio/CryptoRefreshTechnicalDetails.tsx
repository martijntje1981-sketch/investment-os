"use client";

import { useId, useState } from "react";

import {
  buildCryptoRefreshDiagnosticCopyText,
  formatCryptoRefreshDiagnosticSummaryLine,
  type CryptoRefreshDiagnosticRecord,
} from "@/lib/client/cryptoRefreshDiagnostics";

type CryptoRefreshTechnicalDetailsProps = {
  diagnostics: CryptoRefreshDiagnosticRecord[];
};

export default function CryptoRefreshTechnicalDetails({
  diagnostics,
}: CryptoRefreshTechnicalDetailsProps) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const panelId = useId();
  const buttonId = useId();

  if (diagnostics.length === 0) {
    return null;
  }

  async function handleCopy() {
    const text = buildCryptoRefreshDiagnosticCopyText(diagnostics);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <div className="mt-3 border-t border-blue-200 pt-3">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-lg px-2 py-2 text-sm font-semibold text-blue-900 underline decoration-blue-300 underline-offset-2 hover:text-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        Technical details
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="mt-3 space-y-3"
        >
          {diagnostics.map((record) => (
            <article
              key={`${record.canonicalPair ?? record.requestSymbol}:${record.requestPairCurrency ?? ""}`}
              className="rounded-xl border border-blue-200 bg-white/80 p-3 text-sm text-slate-800"
            >
              <pre className="whitespace-pre-wrap break-words font-sans leading-6">
                {formatCryptoRefreshDiagnosticSummaryLine(record)}
              </pre>
            </article>
          ))}

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {copyState === "copied"
              ? "Diagnostic summary copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy diagnostic summary"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
