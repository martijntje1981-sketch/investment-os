import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import { DASHBOARD_PATH } from "@/lib/navigation/appRoutes";

/**
 * Compact dark brand bar for Four Question hubs.
 */
export function QuestionHubBrandBar() {
  return (
    <header
      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B1F3A] px-3 py-2.5 shadow-md shadow-slate-900/20 sm:px-4"
      data-testid="question-hub-brand-bar"
    >
      <Link
        href={DASHBOARD_PATH}
        className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        aria-label="Tobailey Dashboard"
      >
        <TobaileyLogo size={32} showWordmark showTagline={false} onDark />
      </Link>

      <Link
        href={DASHBOARD_PATH}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 sm:px-3"
        data-testid="question-hub-dashboard-link"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span>Dashboard</span>
      </Link>
    </header>
  );
}
