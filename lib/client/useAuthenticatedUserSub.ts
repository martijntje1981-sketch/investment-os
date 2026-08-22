"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { holdAuthReadyUntilSessionRecheck } from "@/lib/client/authSessionResolve";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns the authenticated user's stable unique id (Supabase `user.id`, equivalent
 * to Cognito `sub`). Tracks auth readiness and user changes for portfolio isolation.
 *
 * Re-reads the session when the route changes. Server-action login sets cookies
 * without remounting the root layout; a one-shot getUser() on the login page
 * would otherwise leave Dashboard waiting on a stale logged-out client.
 */
export function useAuthenticatedUserSub() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [userSub, setUserSub] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const userSubRef = useRef<string | null>(null);
  userSubRef.current = userSub;

  useEffect(() => {
    let active = true;

    if (holdAuthReadyUntilSessionRecheck(Boolean(userSubRef.current))) {
      setAuthReady(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserSub(data.user?.id ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUserSub(session?.user?.id ?? null);
        setAuthReady(true);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, supabase]);

  return { userSub, authReady };
}
