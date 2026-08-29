"use client";

import { useEffect, useRef, useState } from "react";

import {
  EXAMPLE_PREP_STAGE_LABELS,
  EXAMPLE_PREP_TIMEOUT_MS,
  EXAMPLE_STATUS_CHANGED_EVENT,
  isExamplePrepComplete,
  markExamplePrepComplete,
  resolveExamplePrepStage,
  type ExamplePrepStage,
} from "@/lib/client/exampleFirstRun";

type PrepStatusPayload = {
  success?: boolean;
  status?: { kind?: string; showBanner?: boolean };
};

type RefreshPricesFn = () => Promise<unknown> | unknown;

/**
 * One-time post-activation preparation for Example Portfolio users.
 * Reuses the caller's refreshPrices — does not invent a second refresh path.
 *
 * Waits until entitlement is `active` (Activator may finish after Dashboard mount).
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
  refreshPrices: RefreshPricesFn;
}) {
  const [active, setActive] = useState(false);
  const [stage, setStage] = useState<ExamplePrepStage>("holdings");
  const [partialNote, setPartialNote] = useState<string | null>(null);
  const startedRef = useRef(false);
  const refreshStartedRef = useRef(false);
  const startMsRef = useRef(0);
  const refreshFnRef = useRef(refreshPrices);
  refreshFnRef.current = refreshPrices;

  useEffect(() => {
    if (!userSub || !portfolioReady || !hasHoldings) return;
    if (isExamplePrepComplete(userSub)) return;
    if (startedRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 24;
    let pollTimer: number | null = null;

    async function decide() {
      if (cancelled || startedRef.current) return;
      if (isExamplePrepComplete(userSub)) return;

      try {
        const response = await fetch("/api/example-portfolio/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as PrepStatusPayload;
        const kind = payload.status?.kind;

        if (kind === "active") {
          if (cancelled || startedRef.current) return;
          startedRef.current = true;
          startMsRef.current = Date.now();
          setActive(true);
          return;
        }

        // Terminal non-example states — do not keep polling.
        if (
          kind === "none" ||
          kind === "converted" ||
          kind === "expired" ||
          kind === "blocked"
        ) {
          return;
        }

        // reserved / unknown — Activator may still be starting the clock.
        attempts += 1;
        if (!cancelled && attempts < maxAttempts) {
          pollTimer = window.setTimeout(() => {
            void decide();
          }, 400);
        }
      } catch {
        /* leave dashboard usable */
      }
    }

    const onStatusChanged = () => {
      void decide();
    };
    window.addEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
    void decide();

    return () => {
      cancelled = true;
      window.removeEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [hasHoldings, portfolioReady, userSub]);

  useEffect(() => {
    if (!active || !userSub) return;
    if (refreshStartedRef.current) return;
    refreshStartedRef.current = true;

    let unfinished = true;
    const timeoutId = window.setTimeout(() => {
      if (!unfinished) return;
      unfinished = false;
      setPartialNote(
        "Some market data is still updating. Your portfolio is ready to explore.",
      );
      markExamplePrepComplete(userSub);
      setStage("done");
      setActive(false);
    }, EXAMPLE_PREP_TIMEOUT_MS);

    void (async () => {
      try {
        // Stable ref — avoid effect re-entry when refreshPrices identity changes.
        await refreshFnRef.current();
      } catch {
        if (unfinished) {
          setPartialNote(
            "Prices could not be fully refreshed. Showing the latest available data.",
          );
        }
      } finally {
        if (!unfinished) return;
        // Brief settle so stage labels can reach insights before dismiss.
        window.setTimeout(() => {
          if (!unfinished) return;
          unfinished = false;
          markExamplePrepComplete(userSub);
          setStage("done");
          setActive(false);
          window.clearTimeout(timeoutId);
        }, 900);
      }
    })();
  }, [active, userSub]);

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
      data-testid="example-portfolio-preparation"
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
