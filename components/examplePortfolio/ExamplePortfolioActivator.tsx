"use client";

import { useEffect } from "react";

import { notifyExampleStatusChanged } from "@/lib/client/exampleFirstRun";
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

        const activateResponse = await fetch(
          "/api/example-portfolio/activate",
          {
            method: "POST",
            credentials: "same-origin",
          },
        );
        if (cancelled) return;

        // Always notify after activate attempt so banner/prep refetch the
        // canonical entitlement — including already-active / reserved→active.
        if (activateResponse.ok) {
          notifyExampleStatusChanged();
        }

        const supabase = createClient();
        await supabase.auth.refreshSession();
        if (cancelled) return;
        notifyExampleStatusChanged();
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
