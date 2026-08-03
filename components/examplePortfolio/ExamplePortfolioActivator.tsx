"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Ensures a verified example session finishes seeding even if the auth
 * callback already ran (refresh / duplicate navigation).
 * Refreshes the client session after activation so metadata mirrors DB truth.
 */
export function ExamplePortfolioActivator() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/example-portfolio/activate", {
          method: "POST",
          credentials: "same-origin",
        });
        if (cancelled) return;

        if (response.ok) {
          const payload = (await response.json()) as {
            success?: boolean;
            result?: { status?: string };
          };
          const status = payload.result?.status;
          if (
            status === "activated" ||
            status === "already_active" ||
            status === "expired" ||
            status === "converted"
          ) {
            const supabase = createClient();
            await supabase.auth.refreshSession();
          }
        }

        // Heal banner/status even when activation was skipped (stale metadata).
        await fetch("/api/example-portfolio/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!cancelled) {
          const supabase = createClient();
          await supabase.auth.refreshSession();
        }
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
