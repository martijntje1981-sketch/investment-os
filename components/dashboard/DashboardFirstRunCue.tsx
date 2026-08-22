"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  dismissExampleFirstRunCue,
  isExamplePrepComplete,
  shouldShowExampleFirstRunCue,
} from "@/lib/client/exampleFirstRun";

/**
 * One-time cue for newly activated Example Portfolio users.
 * Dismissible; normal users never see it. Shown after first prep completes.
 */
export function DashboardFirstRunCue({
  userSub,
  exampleActive,
}: {
  userSub: string | null;
  exampleActive: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!exampleActive || !userSub) {
      setVisible(false);
      return;
    }

    const sync = () => {
      setVisible(
        isExamplePrepComplete(userSub) && shouldShowExampleFirstRunCue(userSub),
      );
    };

    sync();
    // Prep may finish after mount; poll briefly without a long-lived timer.
    const id = window.setInterval(sync, 400);
    const stop = window.setTimeout(() => window.clearInterval(id), 30_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [exampleActive, userSub]);

  if (!visible || !userSub) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/90 px-4 py-3"
      role="status"
    >
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-brand-navy">
        Your portfolio is ready. Start with your scores, holdings or market
        pulse.
      </p>
      <button
        type="button"
        aria-label="Dismiss tip"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-navy/70 transition hover:bg-white/70 hover:text-brand-navy"
        onClick={() => {
          dismissExampleFirstRunCue(userSub);
          setVisible(false);
        }}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
