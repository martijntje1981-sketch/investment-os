"use client";

import { useEffect, useRef, useState } from "react";

import {
  EXAMPLE_PREP_STAGE_LABELS,
  EXAMPLE_PREP_TIMEOUT_MS,
  isExamplePrepComplete,
  markExamplePrepComplete,
  resolveExamplePrepStage,
  type ExamplePrepStage,
} from "@/lib/client/exampleFirstRun";

type PrepStatusPayload = {
  success?: boolean;
  status?: { kind?: string; showBanner?: boolean };
};

/**
 * One-time post-activation preparation for Example Portfolio users.
 * Reuses the caller's refreshPrices — does not invent a second refresh path.
 */
export function ExamplePortfolioPreparation({
  userSub,
  portfolioReady,
  hasHoldings,
  isRefreshing,
  refreshPrices,
}: {
  userSub: string | null;
  portfolioReady: boolean;
  hasHoldings: boolean;
  isRefreshing: boolean;
  refreshPrices: () => Promise<void> | void;
}) {
  const [active, setActive] = useState(false);
  const [stage, setStage] = useState<ExamplePrepStage>("holdings");
  const [partialNote, setPartialNote] = useState<string | null>(null);
  const startedRef = useRef(false);
  const refreshStartedRef = useRef(false);
  const startMsRef = useRef(0);

  useEffect(() => {
    if (!userSub || !portfolioReady || !hasHoldings) return;
    if (isExamplePrepComplete(userSub)) return;
    if (startedRef.current) return;

    let cancelled = false;

    async function decide() {
      try {
        const response = await fetch("/api/example-portfolio/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as PrepStatusPayload;
        if (payload.status?.kind !== "active") {
          // Not an example account — never show prep or mark complete.
          return;
        }
        if (cancelled) return;
        startedRef.current = true;
        startMsRef.current = Date.now();
        setActive(true);
      } catch {
        /* leave dashboard usable */
      }
    }

    void decide();
    return () => {
      cancelled = true;
    };
  }, [hasHoldings, portfolioReady, userSub]);

  useEffect(() => {
    if (!active || !userSub) return;
    if (refreshStartedRef.current) return;
    refreshStartedRef.current = true;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setPartialNote(
        "Some market data is still updating. Your portfolio is ready to explore.",
      );
      markExamplePrepComplete(userSub);
      setStage("done");
      setActive(false);
    }, EXAMPLE_PREP_TIMEOUT_MS);

    void (async () => {
      try {
        await refreshPrices();
      } catch {
        if (!cancelled) {
          setPartialNote(
            "Prices could not be fully refreshed. Showing the latest available data.",
          );
        }
      } finally {
        if (cancelled) return;
        const finish = () => {
          markExamplePrepComplete(userSub);
          setStage("done");
          setActive(false);
          window.clearTimeout(timeoutId);
        };
        // Brief settle so stage labels can reach insights before dismiss.
        window.setTimeout(finish, 900);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [active, refreshPrices, userSub]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startMsRef.current;
      const refreshDone = !isRefreshing && refreshStartedRef.current;
      setStage(resolveExamplePrepStage(elapsed, refreshDone));
    }, 200);
    return () => window.clearInterval(id);
  }, [active, isRefreshing]);

  if (!active) {
    if (partialNote) {
      return (
        <p
          className="rounded-2xl border border-brand/25 bg-brand-soft/80 px-4 py-3 text-[13px] font-medium text-brand-navy"
          role="status"
        >
          {partialNote}
        </p>
      );
    }
    return null;
  }

  const visibleStage: Exclude<ExamplePrepStage, "done"> =
    stage === "done" ? "insights" : stage;

  return (
    <div
      className="rounded-[24px] border border-brand/30 bg-gradient-to-br from-brand-soft via-white to-slate-50 px-5 py-6 shadow-[var(--shadow-card)] md:rounded-[28px] md:px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-navy/70">
        Preparing your portfolio
      </p>
      <ul className="mt-4 space-y-2.5">
        {(
          Object.keys(EXAMPLE_PREP_STAGE_LABELS) as Array<
            Exclude<ExamplePrepStage, "done">
          >
        ).map((key) => {
          const currentIndex = (
            ["holdings", "prices", "scores", "insights"] as const
          ).indexOf(visibleStage);
          const itemIndex = (
            ["holdings", "prices", "scores", "insights"] as const
          ).indexOf(key);
          const done = itemIndex < currentIndex;
          const current = key === visibleStage;
          return (
            <li
              key={key}
              className={`flex items-center gap-2.5 text-[14px] font-semibold ${
                current
                  ? "text-brand-navy"
                  : done
                    ? "text-slate-500"
                    : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  current
                    ? "bg-brand text-brand-navy"
                    : done
                      ? "bg-brand-navy text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
                aria-hidden
              >
                {done ? "✓" : current ? "·" : ""}
              </span>
              {EXAMPLE_PREP_STAGE_LABELS[key]}
              {current ? <span className="sr-only">(in progress)</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
