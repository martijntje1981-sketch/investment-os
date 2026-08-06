"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Returns the authenticated user's stable unique id (Supabase `user.id`, equivalent
 * to Cognito `sub`). Tracks auth readiness and user changes for portfolio isolation.
 */
export function useAuthenticatedUserSub() {
  const supabase = useMemo(() => createClient(), []);
  const [userSub, setUserSub] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

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
  }, [supabase]);

  return { userSub, authReady };
}
