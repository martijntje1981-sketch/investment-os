"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeEuro,
  Briefcase,
  CalendarDays,
  CircleHelp,
  Compass,
  FileUp,
  History,
  ListChecks,
  LogOut,
  Newspaper,
  ScanLine,
  Settings,
  Sparkles,
  Target,
  UserRound,
  Waves,
} from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";
import { useUpcomingEventsNavVisible } from "@/lib/client/useUpcomingEventsNavVisible";
import { clearCachedBaseCurrency } from "@/lib/client/portfolioBaseCurrencyStorage";
import { filterExploreLinksForEventsAvailability } from "@/lib/services/events/availability";
import {
  isAuthRequiredPath,
  isMarketingPath,
  isPublicAppPath,
} from "@/lib/auth/routeAccess";
import {
  GOALS_PATH,
  PORTFOLIO_HISTORY_PATH,
  PORTFOLIO_PATH,
} from "@/lib/navigation/appRoutes";
import { createClient } from "@/lib/supabase/client";

type MenuLink = {
  href: string;
  label: string;
  icon: typeof Settings;
};

const portfolioLinks: MenuLink[] = [
  { href: PORTFOLIO_PATH, label: "Portfolio", icon: Briefcase },
  { href: PORTFOLIO_HISTORY_PATH, label: "Portfolio History", icon: History },
  { href: GOALS_PATH, label: "Goals", icon: Target },
  { href: "/upload", label: "Import holdings", icon: FileUp },
];

const intelligenceLinks: MenuLink[] = [
  { href: "/portfolio-health", label: "Portfolio Scorecard", icon: Activity },
  { href: "/analysis", label: "Analysis", icon: ScanLine },
  { href: "/market-pulse", label: "Market Pulse", icon: Waves },
  { href: "/perspectives", label: "Perspectives", icon: Sparkles },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/events", label: "Upcoming Events", icon: CalendarDays },
  { href: "/discover", label: "Discover", icon: Compass },
];

const accountLinks: MenuLink[] = [
  { href: "/settings", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const supportLinks: MenuLink[] = [
  {
    href: "/supported-instruments",
    label: "Supported Instruments",
    icon: ListChecks,
  },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
  { href: "/pricing", label: "Pricing", icon: BadgeEuro },
];

const guestExploreLinks: MenuLink[] = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/perspectives", label: "Perspectives", icon: Sparkles },
  { href: "/news", label: "Markets / News", icon: Newspaper },
  { href: "/market-pulse", label: "Market Pulse", icon: Waves },
  {
    href: "/supported-instruments",
    label: "Supported Instruments",
    icon: ListChecks,
  },
];

function isMenuLinkActive(
  pathname: string,
  href: string,
  label: string,
): boolean {
  if (href === "/settings") {
    if (label === "Profile" || label === "Settings") {
      return pathname === "/settings" || pathname.startsWith("/settings/");
    }
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldShowAppHeader(pathname: string): boolean {
  if (isMarketingPath(pathname)) return false;
  return isAuthRequiredPath(pathname) || isPublicAppPath(pathname);
}

function MenuSection({
  title,
  links,
  pathname,
  onNavigate,
}: {
  title: string;
  links: MenuLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="px-1.5 py-1.5">
      <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
        {title}
      </p>
      <div className="space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isMenuLinkActive(pathname, link.href, link.label);
          return (
            <Link
              key={`${link.label}-${link.href}`}
              href={link.href}
              role="menuitem"
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold transition ${
                active
                  ? "bg-brand/20 text-brand"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GuestHeader({ pathname }: { pathname: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-label="Tobailey home"
        >
          <TobaileyLogo size={36} showWordmark className="sm:gap-3" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Explore">
          {guestExploreLinks.map((link) => {
            const active = isMenuLinkActive(pathname, link.href, link.label);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  active
                    ? "bg-brand/15 text-brand-navy"
                    : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center rounded-xl px-3 text-[13px] font-semibold text-brand-navy transition hover:bg-brand-soft"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-[40px] items-center rounded-xl bg-brand px-3.5 text-[13px] font-bold text-brand-navy transition hover:bg-brand-hover"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Shared app header: guest chrome on public routes, profile menu when signed in. */
export default function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { open, toggle, close, containerRef, panelRef, triggerRef, menuId } =
    useDismissibleMenu({ closeOnChangeKey: pathname });
  const upcomingEventsNavVisible = useUpcomingEventsNavVisible();
  const visibleIntelligenceLinks = useMemo(
    () =>
      filterExploreLinksForEventsAvailability(
        intelligenceLinks,
        upcomingEventsNavVisible ? "live" : "configuration_missing",
      ),
    [upcomingEventsNavVisible],
  );

  const showHeader = shouldShowAppHeader(pathname);

  useEffect(() => {
    if (!showHeader) {
      setAuthReady(true);
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setAuthReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setUser(session?.user ?? null);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [showHeader, supabase]);

  if (!showHeader || !authReady) return null;

  if (!user) {
    if (!isPublicAppPath(pathname)) return null;
    return <GuestHeader pathname={pathname} />;
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Investor";
  const email = user.email ?? "";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TB";

  async function handleSignOut() {
    close();
    setIsSigningOut(true);
    clearCachedBaseCurrency(user?.id);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[60] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/dashboard"
          className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-label="Tobailey dashboard"
        >
          <TobaileyLogo size={36} showWordmark className="sm:gap-3" />
        </Link>

        <div ref={containerRef} className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="menu"
            aria-label="Profile menu"
            onClick={toggle}
            className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-brand-navy/15 bg-brand-navy px-2 py-1.5 text-white shadow-sm transition hover:bg-brand-navy/90 sm:gap-2.5 sm:px-2.5 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-[11px] font-black text-brand">
              {initials}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[8.5rem] truncate text-[13px] font-bold leading-tight text-white">
                {fullName}
              </span>
              <span className="block max-w-[8.5rem] truncate text-[11px] font-medium text-white/50">
                Signed in
              </span>
            </span>
          </button>

          {open
            ? createPortal(
                <div
                  ref={panelRef}
                  id={menuId}
                  role="menu"
                  aria-label="Profile"
                  className="fixed right-3 top-[calc(3.5rem+0.5rem)] z-[80] grid max-h-[min(32rem,calc(100dvh-3.5rem-var(--bottom-nav-height)-env(safe-area-inset-bottom,0px)-1rem))] w-[min(100vw-1.5rem,16.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden overscroll-none rounded-xl border border-white/10 bg-brand-navy shadow-[0_18px_40px_rgba(11,31,58,0.45)] sm:right-[max(0.75rem,calc((100vw-72rem)/2+1.5rem))] sm:top-[calc(4rem+0.5rem)] sm:max-h-[min(36rem,calc(100dvh-5rem))] sm:w-64"
                  data-testid="profile-menu-panel"
                >
                  <div className="border-b border-white/10 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-[11px] font-black text-brand">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-white">
                          {fullName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                    data-testid="profile-menu-scroll"
                  >
                    <MenuSection
                      title="Portfolio"
                      links={portfolioLinks}
                      pathname={pathname}
                      onNavigate={close}
                    />

                    <div className="mx-3 border-t border-white/10" />

                    <MenuSection
                      title="Intelligence"
                      links={visibleIntelligenceLinks}
                      pathname={pathname}
                      onNavigate={close}
                    />

                    <div className="mx-3 border-t border-white/10" />

                    <MenuSection
                      title="Account"
                      links={accountLinks}
                      pathname={pathname}
                      onNavigate={close}
                    />

                    <div className="mx-3 border-t border-white/10" />

                    <MenuSection
                      title="Support"
                      links={supportLinks}
                      pathname={pathname}
                      onNavigate={close}
                    />
                  </div>

                  <div
                    className="border-t border-white/15 bg-[#0a1a30] px-3 py-2.5"
                    data-testid="profile-menu-footer"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
                      Signed in as
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-white/70">
                      {email || "Account"}
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleSignOut()}
                      disabled={isSigningOut}
                      className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 text-[13px] font-semibold text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy disabled:cursor-wait disabled:opacity-60"
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {isSigningOut ? "Signing out…" : "Log out"}
                    </button>
                  </div>
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>
    </header>
  );
}
