"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function useAuthenticatedFirstName(): string | null {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function applyUser(fullNameRaw: unknown) {
      const fullName =
        typeof fullNameRaw === "string" ? fullNameRaw.trim() : "";
      setFirstName(fullName ? (fullName.split(/\s+/)[0] ?? null) : null);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      applyUser(data.user?.user_metadata?.full_name);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        applyUser(session?.user?.user_metadata?.full_name);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, supabase]);

  return firstName;
}
