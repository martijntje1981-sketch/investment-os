"use client";

import Link from "next/link";
import { FileUp, Plus } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionTitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";
import { portfolioAddPath } from "@/lib/navigation/appRoutes";

/**
 * Shown only when an account still carries demo/sample holdings.
 * Destructive wipe controls are intentionally omitted — demo ids remapped
 * after sync make bulk delete unsafe, and clean personal trials never show
 * this callout.
 */
export function DemoHoldingsCallout({
  exampleActive,
  holdings,
}: {
  exampleActive: boolean;
  holdings: Array<{ id: string }>;
  /** @deprecated Kept for call-site compatibility; unused. */
  exampleSeeded?: boolean;
}) {
  if (!exampleActive || holdings.length === 0) {
    return null;
  }

  return (
    <section
      className={`${appCardClass} ${appCardPaddingClass} border-amber-200 bg-amber-50/70`}
      aria-labelledby="demo-holdings-heading"
      data-testid="demo-holdings-callout"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-800/80">
        Demo Portfolio
      </p>
      <h2 id="demo-holdings-heading" className={`mt-1 ${appSectionTitleClass}`}>
        You are viewing demo holdings.
      </h2>
      <p className={`mt-2 ${appSectionBodyClass} text-slate-700`}>
        This sample book is separate from a clean personal trial. Import your
        own portfolio or add holdings manually when you are ready.
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
      </div>
    </section>
  );
}
