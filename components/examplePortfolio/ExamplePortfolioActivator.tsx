"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { notifyExampleStatusChanged } from "@/lib/client/exampleFirstRun";
import { fetchExamplePortfolioStatus } from "@/lib/client/examplePortfolioStatusCache";
import { isMarketingPath } from "@/lib/auth/routeAccess";
import { createClient } from "@/lib/supabase/client";

export function shouldRunExamplePortfolioActivator(
  pathname: string,
  hasAuthenticatedUser: boolean,
): boolean {
  if (!hasAuthenticatedUser) return false;
  if (isMarketingPath(pathname)) return false;
  return true;
}

/**
 * Heals false example stamps and finishes genuine example activation.
 * Must not start an example clock on ordinary password sessions.
 * Skips public marketing/login/signup. Runs once per authenticated user.
 */
export function ExamplePortfolioActivator() {
  const pathname = usePathname();
  const attemptedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (isMarketingPath(pathname)) return;

    let cancelled = false;

    async function run() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (cancelled || !user) return;
        if (!shouldRunExamplePortfolioActivator(pathname, true)) return;
        if (attemptedForUserRef.current === user.id) return;
        attemptedForUserRef.current = user.id;

        await fetchExamplePortfolioStatus({ userSub: user.id });
        if (cancelled) return;

        const activateResponse = await fetch(
          "/api/example-portfolio/activate",
          {
            method: "POST",
            credentials: "same-origin",
          },
        );
        if (cancelled) return;

        if (activateResponse.ok) {
          notifyExampleStatusChanged();
        }

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
  }, [pathname]);

  return null;
}
