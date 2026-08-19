"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Goal, Mail, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  appIdentityHappenedIconClass,
  appIdentityMattersIconClass,
  appIdentityOnTrackIconClass,
} from "@/components/layout/semanticIdentity";
import { PortfolioBaseCurrencySetting } from "@/components/settings/PortfolioBaseCurrencySetting";
import { PeriodReviewEmailPreferences } from "@/components/companion/PeriodReviewEmailPreferences";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import { createClient } from "@/lib/supabase/client";
import { REVIEW_PATH } from "@/lib/navigation/appRoutes";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { useExampleActiveStatus } from "@/lib/client/useExampleActiveStatus";
import { TRUST_EMAIL_PRIVACY } from "@/lib/content/productTrust";
import { useProductAccess } from "@/lib/client/useProductAccess";
import {
  PlanStatusBadge,
  PlanStatusCard,
} from "@/components/product/ProductAccessNotes";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const { holdings } = useUserPortfolio();
  const exampleActive = useExampleActiveStatus();
  const { goal, hasSavedGoal } = useUserGoal();
  const { baseCurrency, convertEur } = useBaseCurrencyDisplay();
  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );
  const contributions = usePortfolioContributions(
    snapshot.portfolioValue,
    snapshot.portfolioValueAvailable,
    holdings.length > 0,
    holdings,
  );
  const productAccess = useProductAccess(ready);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!ready) {
    return <AppPageLoading />;
  }

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Investor";
  const email = user?.email ?? "Not available";

  return (
    <>
      <PageContainer>
        <PageHero
          title="Settings"
          subtitle="Account, currency and portfolio setup."
          backToDashboard
        />

        <section className={`${appCardClass} ${appCardPaddingClass}`}>
          <div className="flex items-start gap-3">
            <div className={appIdentityHappenedIconClass}>
              <UserRound className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className={appSectionTitleClass}>Account</h2>
              <p className="mt-1 truncate text-[15px] font-semibold text-slate-950">
                {fullName}
              </p>
              <p className={`mt-0.5 truncate ${appSectionMetaClass}`}>{email}</p>
              <div className="mt-3">
                <PlanStatusBadge access={productAccess} />
              </div>
            </div>
          </div>
        </section>

        <PlanStatusCard access={productAccess} />

        <section
          id="reports-email"
          className={`${appCardClass} ${appCardPaddingClass} scroll-mt-24`}
          aria-labelledby="reports-email-heading"
        >
          <h2 id="reports-email-heading" className={`flex items-center gap-3 ${appSectionTitleClass}`}>
            <span className={appIdentityMattersIconClass} aria-hidden>
              <Mail className="h-5 w-5" />
            </span>
            Reports &amp; email
          </h2>
          <p className={`mt-2 ${appSectionBodyClass}`}>
            Your portfolio data is always yours. Export it anytime.{" "}
            {TRUST_EMAIL_PRIVACY}
          </p>
          <div className="mt-4 space-y-4">
            <PeriodReviewEmailPreferences
              access={productAccess}
              disabledForDemo={Boolean(exampleActive)}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={`${REVIEW_PATH}?period=monthly`}
                className="inline-flex min-h-[44px] items-center text-[16px] font-semibold text-brand-navy underline-offset-2 hover:underline"
              >
                Open latest Monthly Review
              </Link>
              <ExportPortfolioButton
                onExport={() =>
                  runPortfolioExport({
                    holdings,
                    entries: contributions.entries,
                    portfolioValueEur: snapshot.portfolioValue,
                    portfolioValueAvailable: snapshot.portfolioValueAvailable,
                    baseCurrency,
                    convertEur,
                    goal,
                    hasSavedGoal,
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className={appCardClass}>
          <h2
            className={`flex items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-6 ${appSectionTitleClass}`}
          >
            <span className={appIdentityOnTrackIconClass} aria-hidden>
              <Goal className="h-5 w-5" />
            </span>
            Portfolio configuration
          </h2>
          <div className="border-b border-slate-100">
            <PortfolioBaseCurrencySetting />
          </div>
          <nav className="divide-y divide-slate-100">
            <SettingsLink
              href="/portfolio"
              icon={<BriefcaseBusiness className="h-4 w-4" />}
              label="Manage holdings"
              detail="Edit investments, cash and prices"
            />
            <SettingsLink
              href="/goals"
              icon={<Goal className="h-4 w-4" />}
              label="Financial goal"
              detail="Target, contributions and progress"
            />
            <SettingsLink
              href="/upload"
              icon={<ArrowRight className="h-4 w-4" />}
              label="Import portfolio"
              detail="CSV, Excel or manual entry"
            />
          </nav>
        </section>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function SettingsLink({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand md:px-6"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-slate-500" aria-hidden>
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-slate-950">
            {label}
          </span>
          <span className={`mt-0.5 block ${appSectionMetaClass}`}>{detail}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}
