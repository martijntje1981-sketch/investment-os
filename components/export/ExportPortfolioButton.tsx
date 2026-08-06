"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import {
  appGhostButtonClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";

type ExportPortfolioButtonProps = {
  onExport: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  variant?: "solid" | "ghost" | "text";
  className?: string;
};

/**
 * Shared one-click Export Portfolio control.
 * Always Excel workbook — no format modal.
 */
export function ExportPortfolioButton({
  onExport,
  disabled = false,
  variant = "ghost",
  className = "",
}: ExportPortfolioButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onExport();
    } finally {
      setBusy(false);
    }
  }

  const base =
    variant === "solid"
      ? appSolidButtonClass
      : variant === "text"
        ? "inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand-navy underline-offset-2 hover:underline disabled:opacity-40"
        : appGhostButtonClass;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || disabled}
      aria-label="Export Portfolio as Excel workbook"
      title="Excel workbook"
      className={`${base} disabled:opacity-40 ${className}`.trim()}
      data-testid="export-portfolio-button"
    >
      <Download className="h-4 w-4" aria-hidden />
      {busy ? "Exporting…" : "Export Portfolio"}
    </button>
  );
}
