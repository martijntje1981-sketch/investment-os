"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavigationItem = {
  label: string;
  href: string;
  icon: ReactNode;
  activePaths: string[];
};

const navigationItems: NavigationItem[] = [
  {
    label: "Vandaag",
    href: "/",
    activePaths: ["/"],
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    activePaths: ["/portfolio", "/holding"],
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    ),
  },
  {
    label: "Briefing",
    href: "/briefing",
    activePaths: ["/briefing"],
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M7 8h10" />
        <path d="M7 12h6" />
        <path d="M7 16h8" />
      </svg>
    ),
  },
  {
    label: "Goals",
    href: "/goals",
    activePaths: ["/goals"],
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    ),
  },
];

function isNavigationItemActive(
  pathname: string,
  activePaths: string[],
): boolean {
  return activePaths.some((activePath) => {
    if (activePath === "/") {
      return pathname === "/";
    }

    return (
      pathname === activePath ||
      pathname.startsWith(`${activePath}/`)
    );
  });
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
        {navigationItems.map((item) => {
          const active = isNavigationItemActive(
            pathname,
            item.activePaths,
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition-all duration-200 ${
                active
                  ? "bg-slate-950 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span
                className={`transition-transform duration-200 group-hover:-translate-y-0.5 ${
                  active ? "text-white" : "text-slate-500"
                }`}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>

              {active && (
                <span className="absolute -top-px h-1 w-7 rounded-b-full bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;