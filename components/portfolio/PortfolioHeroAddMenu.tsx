"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Banknote, ChevronDown, Coins, Plus } from "lucide-react";

import {
  appAnalysisUtilityButtonClass,
  appSecondaryButtonClass,
} from "@/components/layout/appSurface";
import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";

export function PortfolioHeroAddMenu({
  onAddInvestment,
  onAddCrypto,
  onAddCash,
  appearance = "onLight",
}: {
  onAddInvestment: () => void;
  onAddCrypto: () => void;
  onAddCash: () => void;
  appearance?: "onLight" | "onDark";
}) {
  const { open, toggle, close, containerRef, triggerRef, panelRef, menuId } =
    useDismissibleMenu({ lockScroll: false });
  const [menuBox, setMenuBox] = useState<{ top: number; right: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuBox({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, [open, triggerRef]);

  function choose(action: () => void) {
    close();
    action();
  }

  const menu =
    open && menuBox && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label="Add to portfolio"
            className="fixed z-[80] min-w-[13.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_28px_-12px_rgba(15,23,42,0.28)]"
            style={{ top: menuBox.top, right: menuBox.right }}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={
          appearance === "onDark"
            ? appAnalysisUtilityButtonClass
            : appSecondaryButtonClass
        }
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
      {menu}
    </div>
  );
}
