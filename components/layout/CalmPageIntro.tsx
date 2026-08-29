import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_PATH } from "@/lib/navigation/appRoutes";

export function CalmPageIntro({
  eyebrow,
  title,
  subtitle,
  actions,
  backToDashboard = false,
  backHref,
  backLabel,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backToDashboard?: boolean;
  backHref?: string;
  backLabel?: string;
  onBack?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const resolvedHref = backHref ?? (backToDashboard ? DASHBOARD_PATH : null);
  const resolvedLabel = backLabel ?? (backToDashboard ? "Back to Dashboard" : "Back");

  return (
    <header className="min-w-0" data-testid="calm-page-intro">
      {resolvedHref ? (
        <Link
          href={resolvedHref}
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {resolvedLabel}
        </Link>
      ) : null}
      <div className={`flex min-w-0 items-start justify-between gap-3 ${resolvedHref ? "mt-2" : ""}`}>
        <div className="min-w-0">
          <p className={appHeroMetricLabelClass}>{eyebrow}</p>
          <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
