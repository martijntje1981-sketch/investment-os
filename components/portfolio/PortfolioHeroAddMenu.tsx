"use client";

import { Banknote, ChevronDown, Coins, Plus } from "lucide-react";

import { appSecondaryButtonClass } from "@/components/layout/appSurface";
import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";

export function PortfolioHeroAddMenu({
  onAddInvestment,
  onAddCrypto,
  onAddCash,
}: {
  onAddInvestment: () => void;
  onAddCrypto: () => void;
  onAddCash: () => void;
}) {
  const { open, toggle, close, containerRef, triggerRef, menuId } =
    useDismissibleMenu({ lockScroll: false });

  function choose(action: () => void) {
    close();
    action();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={appSecondaryButtonClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
        data-testid="portfolio-hero-add-menu"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Add to portfolio"
          className="absolute right-0 z-30 mt-2 min-w-[13.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_28px_-12px_rgba(15,23,42,0.28)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
            onClick={() => choose(onAddInvestment)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add investment
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
            onClick={() => choose(onAddCrypto)}
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Add crypto
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50"
            onClick={() => choose(onAddCash)}
          >
            <Banknote className="h-4 w-4" aria-hidden="true" />
            Add cash
          </button>
        </div>
      ) : null}
    </div>
  );
}
