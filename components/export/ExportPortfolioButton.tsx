"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import {
  appControlDisabledClass,
  appHeroSecondaryButtonClass,
  appSecondaryButtonClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";

type ExportPortfolioButtonProps = {
  onExport: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  variant?: "solid" | "secondary" | "hero" | "text" | "ghost";
  className?: string;
};

/**
 * Shared one-click Export Portfolio control.
 * Always Excel workbook — no format modal.
 */
export function ExportPortfolioButton({
  onExport,
  disabled = false,
  variant = "secondary",
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
      : variant === "hero"
        ? appHeroSecondaryButtonClass
        : variant === "text"
          ? `${appTextLinkClass} ${appControlDisabledClass}`
          : appSecondaryButtonClass;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || disabled}
      aria-label="Export portfolio as Excel workbook"
      title="Excel workbook (.xlsx)"
      className={`${base} ${className}`.trim()}
      data-testid="export-portfolio-button"
    >
      <Download className="h-4 w-4" aria-hidden />
      {busy ? "Exporting…" : "Export portfolio (.xlsx)"}
    </button>
  );
}
