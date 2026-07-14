"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

const navigationItems = [
  {
    label: "Features",
    href: "#features",
  },
  {
    label: "How it works",
    href: "#how-it-works",
  },
  {
    label: "Pricing",
    href: "#pricing",
  },
  {
    label: "FAQ",
    href: "/faq",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function MarketingHeader() {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={closeMenu}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black tracking-[-0.02em] text-slate-950">
              Investment OS
            </p>

            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Complete investment system
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
     href="/login"
     className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
   >
     Log in
     </Link>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsMenuOpen((current) => !current)
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 lg:hidden"
          aria-label={
            isMenuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
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

      {isMenuOpen ? (
        <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
              >
                View dashboard
              </Link>

              <Link
                href="/upload"
                onClick={closeMenu}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}