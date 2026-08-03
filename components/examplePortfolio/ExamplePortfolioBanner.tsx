"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { EXAMPLE_KEEP_PORTFOLIO_HREF } from "@/lib/services/examplePortfolio/types";
import {
  isAuthRequiredPath,
  isMarketingPath,
  isPublicAppPath,
} from "@/lib/auth/routeAccess";

type BannerStatus = {
  showBanner: boolean;
  bannerLabel: string | null;
  kind: string;
};

/**
 * Compact fixed bar under the header for active example portfolios.
 * Status comes from the server entitlement resolver — not stale metadata alone.
 */
export function ExamplePortfolioBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BannerStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/example-portfolio/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
        return;
      }
      const payload = (await response.json()) as {
        success?: boolean;
        status?: BannerStatus;
      };
      if (!payload.success || !payload.status) {
        setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
        return;
      }
      setStatus(payload.status);
    } catch {
      setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const routeAllowsBanner =
    !isMarketingPath(pathname) &&
    (isAuthRequiredPath(pathname) || isPublicAppPath(pathname));

  const show =
    Boolean(status?.showBanner) &&
    Boolean(status?.bannerLabel) &&
    routeAllowsBanner;

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

  if (!show || !status?.bannerLabel) return null;

  return (
    <div
      className="fixed inset-x-0 top-14 z-[55] border-b border-brand/25 bg-brand-soft/95 px-3 py-2 backdrop-blur sm:top-16 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-brand-navy sm:text-[13px]">
          {status.bannerLabel}
        </p>
        <Link
          href={EXAMPLE_KEEP_PORTFOLIO_HREF}
          className="inline-flex min-h-[36px] items-center rounded-lg bg-navy-hero px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-navy-card sm:text-[13px]"
        >
          Keep my portfolio
        </Link>
      </div>
    </div>
  );
}
