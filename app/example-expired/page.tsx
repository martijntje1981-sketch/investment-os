"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  appBrandSoftButtonClass,
  appCardClass,
  appCardPaddingClass,
  appSectionSubtitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import { EXAMPLE_KEEP_PORTFOLIO_HREF } from "@/lib/services/examplePortfolio/types";
import { PUBLIC_EXPLORE_PATH } from "@/lib/content/publicExplore";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import { logout } from "@/app/auth/actions";

export default function ExampleExpiredPage() {
  return (
    <>
      <PageContainer>
        <section
          className={`${appCardClass} ${appCardPaddingClass} max-w-xl`}
          aria-labelledby="example-expired-heading"
          data-testid="example-expired-panel"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            7-day Personal Trial
          </p>
          <h1
            id="example-expired-heading"
            className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950"
          >
            Your 7-day Personal Trial has ended
          </h1>
          <p className={`mt-3 ${appSectionSubtitleClass}`}>
            Upgrade to continue using Tobailey&apos;s Premium features. Your
            portfolio data remains yours, and you can still export your Portfolio
            History to Excel.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={EXAMPLE_KEEP_PORTFOLIO_HREF} className={appSolidButtonClass}>
              Upgrade
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={PORTFOLIO_HISTORY_PATH}
              className={appBrandSoftButtonClass}
              data-testid="expired-export-history"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export Portfolio History
            </Link>
            <Link href={PUBLIC_EXPLORE_PATH} className={appBrandSoftButtonClass}>
              Browse without signing in
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 sm:w-auto"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
