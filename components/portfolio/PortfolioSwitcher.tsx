"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lock, Plus } from "lucide-react";

import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";
import { useActivePortfolioOptional } from "@/lib/client/useActivePortfolio";
import { sanitizePortfolioOneName } from "@/lib/client/portfolioOne";
import { PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";
import { MULTI_PORTFOLIO_COPY } from "@/lib/content/multiPortfolioCopy";
import { useProductAccess } from "@/lib/client/useProductAccess";

export function PortfolioSwitcher({
  appearance = "onLight",
}: {
  appearance?: "onLight" | "onDark";
}) {
  const active = useActivePortfolioOptional();
  const productAccess = useProductAccess(Boolean(active?.ready));
  const router = useRouter();
  const { open, toggle, close, containerRef, triggerRef, menuId } =
    useDismissibleMenu({ lockScroll: false });
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!active?.ready || !active.activePortfolio) return null;

  const currentName = active.activePortfolio.name;

  async function handleSelect(portfolioId: string, locked: boolean) {
    if (locked) {
      setMessage(MULTI_PORTFOLIO_COPY.lockedSaved);
      return;
    }
    if (active!.selectPortfolio(portfolioId)) {
      setMessage(null);
      close();
    }
  }

  async function handleCreate() {
    if (!active!.canCreate) {
      setMessage(
        productAccess.tier === "free"
          ? MULTI_PORTFOLIO_COPY.freeCreate
          : MULTI_PORTFOLIO_COPY.completeIncludes,
      );
      setCreating(false);
      return;
    }
    const name = sanitizePortfolioOneName(draftName);
    setPending(true);
    const result = await active!.createPortfolio(name);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setCreating(false);
    setDraftName("");
    setMessage(null);
    close();
    router.push(`${PORTFOLIO_PATH}?add=investment`);
  }

  async function handleRename(portfolioId: string) {
    const name = sanitizePortfolioOneName(renameValue);
    setPending(true);
    const ok = await active!.renamePortfolio(portfolioId, name);
    setPending(false);
    if (ok) {
      setRenamingId(null);
      setRenameValue("");
    }
  }

  return (
    <div className="relative min-w-0 max-w-[11rem] sm:max-w-[14rem]" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        aria-label={`${MULTI_PORTFOLIO_COPY.switcherLabel}: ${currentName}`}
        data-testid="portfolio-switcher"
        className={`flex min-h-[36px] w-full min-w-0 items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-[40px] sm:px-2.5 ${
          appearance === "onDark"
            ? "border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15"
            : "border-brand/40 bg-brand-soft text-brand-navy hover:border-brand/70 hover:bg-brand-soft focus-visible:ring-offset-2"
        }`}
      >
        <span className="min-w-0 truncate">{currentName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""} ${
            appearance === "onDark" ? "text-white/70" : "text-brand-strong"
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Portfolios"
          data-testid="portfolio-switcher-menu"
          className="absolute left-0 top-[calc(100%+0.4rem)] z-50 w-[min(calc(100vw-2rem),18rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/40"
        >
          <ul className="space-y-0.5">
            {active.portfolios.map((portfolio) => {
              const selected = portfolio.id === active.activePortfolioId;
              return (
                <li key={portfolio.id}>
                  {renamingId === portfolio.id ? (
                    <form
                      className="flex gap-1 p-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(portfolio.id);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        maxLength={60}
                        className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
                        aria-label={MULTI_PORTFOLIO_COPY.nameLabel}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-brand px-2 text-xs font-semibold text-brand-navy"
                      >
                        Save
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => void handleSelect(portfolio.id, portfolio.locked)}
                      className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold ${
                        portfolio.locked
                          ? "text-slate-400"
                          : selected
                            ? "bg-brand-soft text-brand-navy"
                            : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : portfolio.locked ? (
                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{portfolio.name}</span>
                      {portfolio.accessible ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="shrink-0 text-[11px] font-medium text-slate-500 underline-offset-2 hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRenamingId(portfolio.id);
                            setRenameValue(portfolio.name);
                          }}
                        >
                          Rename
                        </span>
                      ) : null}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t border-slate-100 pt-2">
            {creating && active.canCreate ? (
              <form
                className="space-y-2 px-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreate();
                }}
              >
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {MULTI_PORTFOLIO_COPY.nameLabel}
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    maxLength={60}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900"
                    autoFocus
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-[44px] w-full rounded-xl bg-brand text-sm font-semibold text-brand-navy"
                >
                  {MULTI_PORTFOLIO_COPY.createLabel}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!active.canCreate) {
                    setMessage(
                      productAccess.tier === "free"
                        ? MULTI_PORTFOLIO_COPY.freeCreate
                        : MULTI_PORTFOLIO_COPY.completeIncludes,
                    );
                    return;
                  }
                  setCreating(true);
                  setMessage(null);
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {MULTI_PORTFOLIO_COPY.createLabel}
              </button>
            )}
          </div>

          {message ? (
            <p className="mt-2 px-2 pb-1 text-[12px] font-medium leading-5 text-slate-600">
              {message}
            </p>
          ) : active.portfolios.some((portfolio) => portfolio.locked) ? (
            <p className="mt-2 px-2 pb-1 text-[12px] font-medium leading-5 text-slate-600">
              {MULTI_PORTFOLIO_COPY.lockedSaved}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
