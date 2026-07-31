"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Compass,
  FileUp,
  ListChecks,
  LogOut,
  Newspaper,
  Settings,
  UserRound,
  Waves,
} from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";
import { clearCachedBaseCurrency } from "@/lib/client/portfolioBaseCurrencyStorage";
import { createClient } from "@/lib/supabase/client";

const protectedRoutes = [
  "/dashboard",
  "/portfolio",
  "/upload",
  "/analysis",
  "/briefing",
  "/news",
  "/discover",
  "/goals",
  "/settings",
  "/holding",
  "/market-pulse",
  "/portfolio-health",
  "/supported-instruments",
];

type MenuLink = {
  href: string;
  label: string;
  icon: typeof Settings;
};

const accountLinks: MenuLink[] = [
  { href: "/settings", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const exploreLinks: MenuLink[] = [
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/portfolio-health", label: "Portfolio Health", icon: Activity },
  { href: "/market-pulse", label: "Market Pulse", icon: Waves },
  { href: "/supported-instruments", label: "Supported Instruments", icon: ListChecks },
  { href: "/upload", label: "Import holdings", icon: FileUp },
];

function isMenuLinkActive(pathname: string, href: string, label: string): boolean {
  if (href === "/settings") {
    if (label === "Profile" || label === "Settings") {
      return pathname === "/settings" || pathname.startsWith("/settings/");
    }
  }
  return pathname === href || pathname.startsWith(`${href}/`);
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
                  ? "bg-white/15 text-white"
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

export default function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    open,
    toggle,
    close,
    containerRef,
    triggerRef,
    menuId,
  } = useDismissibleMenu({ closeOnChangeKey: pathname });

  const isProtectedPage = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  useEffect(() => {
    if (!isProtectedPage) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ?? null);
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
  }, [isProtectedPage, supabase]);

  if (!isProtectedPage || !user) return null;

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
      .join("") || "IO";

  async function handleSignOut() {
    close();
    setIsSigningOut(true);
    clearCachedBaseCurrency(user?.id);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="fixed right-4 top-4 z-[60] sm:right-6 sm:top-5">
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          aria-label="Profile menu"
          onClick={toggle}
          className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950 px-2 py-1.5 text-white shadow-lg transition hover:bg-slate-900 sm:gap-2.5 sm:px-2.5 sm:py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black text-white">
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

        {open ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Profile"
            className="absolute right-0 mt-2 w-[15.5rem] overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.45)] sm:w-64"
          >
            <div className="border-b border-white/10 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-white">
                    {fullName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-white/45">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            <MenuSection
              title="Account"
              links={accountLinks}
              pathname={pathname}
              onNavigate={close}
            />

            <div className="mx-3 border-t border-white/10" />

            <MenuSection
              title="Explore"
              links={exploreLinks}
              pathname={pathname}
              onNavigate={close}
            />

            <div className="mx-3 border-t border-white/10" />

            <div className="px-1.5 py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
