"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Compass, Menu, X } from "lucide-react";

import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import { BRAND } from "@/lib/brand";
import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";
import {
  PUBLIC_EXPLORE_DESTINATIONS,
  PUBLIC_EXPLORE_PATH,
} from "@/lib/content/publicExplore";

const navigationItems = [
  {
    label: "Four Questions",
    href: "/#four-questions",
  },
  {
    label: "How it works",
    href: "/#how-it-works",
  },
  {
    label: "Plans",
    href: "/#plans",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Help",
    href: "/faq",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

type MarketingHeaderProps = {
  /** When the visitor already has a session on a public marketing page. */
  signedIn?: boolean;
};

export default function MarketingHeader({
  signedIn = false,
}: MarketingHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    open: exploreOpen,
    toggle: toggleExplore,
    close: closeExplore,
    containerRef: exploreContainerRef,
    triggerRef: exploreTriggerRef,
    menuId: exploreMenuId,
  } = useDismissibleMenu();

  function closeMenu() {
    setIsMenuOpen(false);
    closeExplore();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center" onClick={closeMenu}>
          <TobaileyLogo size={44} showWordmark showTagline />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <div className="relative" ref={exploreContainerRef}>
            <button
              ref={exploreTriggerRef}
              type="button"
              onClick={toggleExplore}
              aria-expanded={exploreOpen}
              aria-controls={exploreMenuId}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-brand-navy"
            >
              Explore
              <ChevronDown
                className={`h-4 w-4 transition ${exploreOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {exploreOpen ? (
              <div
                id={exploreMenuId}
                role="menu"
                aria-label="Explore Tobailey"
                className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/40"
              >
                <Link
                  href={PUBLIC_EXPLORE_PATH}
                  role="menuitem"
                  onClick={closeExplore}
                  className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-brand-soft"
                >
                  <Compass
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm font-bold text-brand-navy">
                      Explore Tobailey
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">
                      Open the public intelligence hub
                    </span>
                  </span>
                </Link>
                <div className="my-1 border-t border-slate-100" />
                {PUBLIC_EXPLORE_DESTINATIONS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={closeExplore}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-brand-soft hover:text-brand-navy"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-brand-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              data-analytics="desktop-open-tobailey"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-brand-soft hover:text-brand-navy"
            >
              Open Tobailey
            </Link>
          ) : (
            <Link
              href="/login"
              data-analytics="desktop-signin"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-brand-soft hover:text-brand-navy"
            >
              Sign in
            </Link>
          )}

          <Link
            href="/signup?intent=trial"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-navy shadow-sm transition hover:bg-brand-hover"
          >
            Start your 14-day trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {signedIn ? (
            <Link
              href="/dashboard"
              data-analytics="mobile-open-tobailey"
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
            >
              Open Tobailey
            </Link>
          ) : (
            <Link
              href="/login"
              data-analytics="mobile-signin"
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-navy"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-2"
            aria-label={BRAND.name}
          >
            <p className="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Explore
            </p>
            <Link
              href={PUBLIC_EXPLORE_PATH}
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand-soft"
            >
              Explore Tobailey
            </Link>
            {PUBLIC_EXPLORE_DESTINATIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-brand-soft"
              >
                {item.title}
              </Link>
            ))}

            <div className="my-2 border-t border-slate-200" />

            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-brand-soft"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 grid gap-3 border-t border-slate-200 pt-5">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-brand-navy"
                >
                  Open Tobailey
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-brand-navy"
                >
                  Sign in
                </Link>
              )}

              <Link
                href="/signup?intent=trial"
                onClick={closeMenu}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-navy"
              >
                Start your 14-day trial
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={PUBLIC_EXPLORE_PATH}
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-brand-navy"
              >
                Explore Demo Portfolio
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
