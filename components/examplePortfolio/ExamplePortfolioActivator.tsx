"use client";

import { useEffect } from "react";

/**
 * Ensures a verified example session finishes seeding even if the auth
 * callback already ran (refresh / duplicate navigation).
 */
export function ExamplePortfolioActivator() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetch("/api/example-portfolio/activate", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        /* ignore — banner/middleware still use metadata when present */
      }
      if (cancelled) return;
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
