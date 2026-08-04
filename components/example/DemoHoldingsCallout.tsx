"use client";

import { useState } from "react";
import Link from "next/link";
import { FileUp, Plus, RefreshCw } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionTitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import {
  canSafelyReplaceDemoPortfolio,
  DEMO_REPLACE_UNSAFE_REASON,
} from "@/lib/client/demoPortfolioSafety";
import { PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";
import { portfolioAddPath } from "@/lib/navigation/appRoutes";

export function DemoHoldingsCallout({
  exampleActive,
  holdings,
  exampleSeeded = true,
}: {
  exampleActive: boolean;
  holdings: Array<{ id: string }>;
  exampleSeeded?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  if (!exampleActive || holdings.length === 0) {
    return null;
  }

  function handleConfirmReplace() {
    const safety = canSafelyReplaceDemoPortfolio({
      holdings,
      exampleSeeded,
    });
    if (!safety.safe) {
      setBlockedMessage(safety.reason);
      setConfirmOpen(false);
      return;
    }
    // Safe path reserved for when durable origin stamps exist.
    setBlockedMessage(DEMO_REPLACE_UNSAFE_REASON);
    setConfirmOpen(false);
  }

  return (
    <section
      className={`${appCardClass} ${appCardPaddingClass} border-amber-200 bg-amber-50/70`}
      aria-labelledby="demo-holdings-heading"
      data-testid="demo-holdings-callout"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-800/80">
        Sample data
      </p>
      <h2 id="demo-holdings-heading" className={`mt-1 ${appSectionTitleClass}`}>
        You are viewing demo holdings.
      </h2>
      <p className={`mt-2 ${appSectionBodyClass} text-slate-700`}>
        Add your own investments, import a portfolio, or remove the sample data
        when you are ready. These holdings do not belong to your personal
        account.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={PORTFOLIO_SETUP_ROUTES.import}
          className={appSolidButtonClass}
          data-testid="demo-import-action"
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Import my portfolio
        </Link>
        <Link
          href={portfolioAddPath("investment")}
          className={appBrandSoftButtonClass}
          data-testid="demo-manual-add-action"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add holdings manually
        </Link>
        <button
          type="button"
          className={appBrandSoftButtonClass}
          onClick={() => {
            setBlockedMessage(null);
            setConfirmOpen(true);
          }}
          data-testid="demo-start-fresh-action"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Start fresh
        </button>
      </div>

      {blockedMessage ? (
        <p className="mt-3 text-sm font-medium text-slate-700" role="status">
          {blockedMessage} Use Import or Add holdings manually instead.
        </p>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-replace-title"
          data-testid="demo-start-fresh-dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3
              id="demo-replace-title"
              className="text-lg font-bold text-slate-950"
            >
              Replace the demo portfolio?
            </h3>
            <p className={`mt-2 ${appSectionBodyClass}`}>
              This removes all sample holdings and demo history. Your own saved
              data will not be deleted.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                className={appSolidButtonClass}
                onClick={handleConfirmReplace}
                data-testid="demo-replace-confirm"
              >
                Replace demo portfolio
              </button>
              <button
                type="button"
                className={appBrandSoftButtonClass}
                onClick={() => setConfirmOpen(false)}
                data-testid="demo-replace-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
