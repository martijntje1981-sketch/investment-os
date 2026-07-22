"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function useAuthenticatedFirstName(): string | null {
  const supabase = useMemo(() => createClient(), []);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const fullName =
        typeof data.user?.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name.trim()
          : "";

      if (!fullName) {
        setFirstName(null);
        return;
      }

      setFirstName(fullName.split(/\s+/)[0] ?? null);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  return firstName;
}
