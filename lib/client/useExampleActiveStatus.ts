"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { EXAMPLE_STATUS_CHANGED_EVENT } from "@/lib/client/exampleFirstRun";

/**
 * Lightweight Example Portfolio active flag for Dashboard first-run UI.
 * Uses the no-store status endpoint — never infers from metadata alone.
 */
export function useExampleActiveStatus(enabled = true): boolean {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setActive(false);
      return;
    }
    try {
      const response = await fetch("/api/example-portfolio/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setActive(false);
        return;
      }
      const payload = (await response.json()) as {
        status?: { kind?: string; showBanner?: boolean };
      };
      setActive(
        payload.status?.kind === "active" ||
          payload.status?.showBanner === true,
      );
    } catch {
      setActive(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    const onStatusChanged = () => {
      void load();
    };
    window.addEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
    return () => {
      window.removeEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
    };
  }, [load, pathname]);

  return active;
}
