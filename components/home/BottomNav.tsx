"use client";

import type { RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Ellipsis,
  FileUp,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Newspaper,
  ScanLine,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

import { appBottomNavLabelClass } from "@/components/layout/appSurface";
import { isBottomNavItemActive } from "@/components/home/bottomNavActive";
import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  isAuthRequiredPath,
  isMarketingPath,
  isPublicAppPath,
} from "@/lib/auth/routeAccess";
import {
  ANALYSIS_PATH,
  DASHBOARD_PATH,
  GOALS_PATH,
  PORTFOLIO_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";
import {
  DISCOVER_DESTINATIONS,
  isDiscoverHrefActive,
  isMoreNavPathActive,
} from "@/lib/navigation/discoverDestinations";

const authenticatedItems = [
  {
    label: "Dashboard",
    href: DASHBOARD_PATH,
    icon: LayoutDashboard,
  },
  {
    label: "Portfolio",
    href: PORTFOLIO_PATH,
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    label: "News",
    href: "/news",
    icon: Newspaper,
  },
  {
    label: "Analysis",
    href: ANALYSIS_PATH,
    icon: ScanLine,
  },
] as const;

const guestItems = [
  {
    label: "Perspectives",
    href: "/perspectives",
    icon: Sparkles,
  },
  {
    label: "Markets",
    href: "/news",
    icon: Newspaper,
  },
  {
    label: "Instruments",
    href: "/supported-instruments",
    icon: ListChecks,
  },
  {
    label: "Sign in",
    href: "/login",
    icon: LogIn,
  },
] as const;

const moreWorkspaceLinks = [
  { href: REVIEW_PATH, label: "Your Review", icon: BookOpen },
  { href: GOALS_PATH, label: "Goals", icon: Target },
  { href: "/portfolio-health", label: "Portfolio Scorecard", icon: Activity },
  { href: "/upload", label: "Import holdings", icon: FileUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function shouldShowNav(pathname: string, authenticated: boolean): boolean {
  if (isMarketingPath(pathname)) return false;
  if (pathname.startsWith("/auth")) return false;
  if (authenticated) {
    return isAuthRequiredPath(pathname) || isPublicAppPath(pathname);
  }
  return isPublicAppPath(pathname);
}

function MoreMenuPanel({
  pathname,
  open,
  menuId,
  panelRef,
  onNavigate,
}: {
  pathname: string;
  open: boolean;
  menuId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onNavigate: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      id={menuId}
      role="dialog"
      aria-label="More destinations"
      className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] z-[70] mx-auto max-h-[min(70dvh,32rem)] w-full max-w-6xl overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)]"
      data-testid="bottom-nav-more-panel"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          More
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          Discover tools and account
        </p>
      </div>
      <div className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain px-2 py-2 pb-4">
        <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Discover
        </p>
        <div className="space-y-0.5">
          {DISCOVER_DESTINATIONS.map((item) => {
            const Icon = item.icon;
            const active = isDiscoverHrefActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                  active
                    ? "bg-brand-soft text-brand-navy"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-slate-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mx-2 my-2 border-t border-slate-100" />

        <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Workspace
        </p>
        <div className="space-y-0.5">
          {moreWorkspaceLinks.map((item) => {
            const Icon = item.icon;
            const active = isBottomNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition ${
                  active
                    ? "bg-brand-soft text-brand-navy"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function BottomNavigation() {
  const pathname = usePathname();
  const { userSub, portfolioReady } = useUserPortfolio();
  const { open, toggle, close, containerRef, panelRef, triggerRef, menuId } =
    useDismissibleMenu({ closeOnChangeKey: pathname });

  if (!portfolioReady) return null;
  if (!shouldShowNav(pathname, Boolean(userSub))) return null;

  if (!userSub) {
    return (
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-hidden border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-4 gap-0.5 px-1 py-2 sm:gap-2 sm:px-4">
          {guestItems.map((item) => {
            const Icon = item.icon;
            const active = isBottomNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 ${appBottomNavLabelClass} transition sm:rounded-2xl sm:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  active
                    ? "bg-brand-soft text-brand-navy"
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
                }`}
              >
                <Icon className="mb-1 h-5 w-5" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  const moreActive = isMoreNavPathActive(pathname);

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-hidden border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div
        ref={containerRef}
        className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-0.5 px-1 py-2 sm:gap-2 sm:px-4"
      >
        {authenticatedItems.map((item) => {
          const Icon = item.icon;
          const active = isBottomNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 ${appBottomNavLabelClass} transition sm:rounded-2xl sm:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                active
                  ? "bg-brand-soft text-brand-navy"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
              }`}
            >
              <Icon className="mb-1 h-5 w-5" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="dialog"
          aria-label="More destinations"
          onClick={toggle}
          className={`flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 ${appBottomNavLabelClass} transition sm:rounded-2xl sm:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
            moreActive || open
              ? "bg-brand-soft text-brand-navy"
              : "text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
          }`}
          data-testid="bottom-nav-more-trigger"
        >
          <Ellipsis className="mb-1 h-5 w-5" strokeWidth={1.8} aria-hidden />
          <span>More</span>
        </button>
      </div>

      <MoreMenuPanel
        pathname={pathname}
        open={open}
        menuId={menuId}
        panelRef={panelRef}
        onNavigate={close}
      />
    </nav>
  );
}
