/**
 * Flip true after the current paint so non-critical work can wait.
 */

"use client";

import { useEffect, useState } from "react";

export function useAfterFirstPaint(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(activate, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(activate, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [enabled]);

  return ready;
}
