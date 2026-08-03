"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Heals false example stamps and finishes genuine example activation.
 * Must not start an example clock on ordinary password sessions.
 */
export function ExamplePortfolioActivator() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Status endpoint repairs false activations and heals metadata.
        await fetch("/api/example-portfolio/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;

        await fetch("/api/example-portfolio/activate", {
          method: "POST",
          credentials: "same-origin",
        });
        if (cancelled) return;

        const supabase = createClient();
        await supabase.auth.refreshSession();
      } catch {
        /* ignore — banner still resolves via status API */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
