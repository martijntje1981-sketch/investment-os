"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  EXAMPLE_KEEP_PORTFOLIO_HREF,
  formatExampleBannerLabel,
  isExampleActive,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";
import { createClient } from "@/lib/supabase/client";
import {
  isAuthRequiredPath,
  isMarketingPath,
} from "@/lib/auth/routeAccess";

/**
 * Compact fixed bar under the header for active example portfolios.
 * Does not cover bottom navigation.
 */
export function ExamplePortfolioBanner() {
  const pathname = usePathname();
  const [meta, setMeta] = useState<ExamplePortfolioUserMetadata | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const next = (data.user?.user_metadata ??
        null) as ExamplePortfolioUserMetadata | null;
      setMeta(next);
    }

    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const show =
    Boolean(meta) &&
    isExampleActive(meta) &&
    !isMarketingPath(pathname) &&
    (isAuthRequiredPath(pathname) || pathname === "/explore");

  useEffect(() => {
    if (!show) {
      document.documentElement.removeAttribute("data-example-banner");
      return;
    }
    document.documentElement.setAttribute("data-example-banner", "true");
    return () => {
      document.documentElement.removeAttribute("data-example-banner");
    };
  }, [show]);

  if (!show || !meta?.example_expires_at) return null;

  const label = formatExampleBannerLabel(meta.example_expires_at);

  return (
    <div
      className="fixed inset-x-0 top-14 z-[55] border-b border-amber-200/80 bg-amber-50/95 px-3 py-2 backdrop-blur sm:top-16 sm:px-4"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-amber-950 sm:text-[13px]">
          {label}
        </p>
        <Link
          href={EXAMPLE_KEEP_PORTFOLIO_HREF}
          className="inline-flex min-h-[36px] items-center rounded-lg bg-navy-hero px-3 py-1.5 text-[12px] font-bold text-white sm:text-[13px]"
        >
          Keep my portfolio
        </Link>
      </div>
    </div>
  );
}
