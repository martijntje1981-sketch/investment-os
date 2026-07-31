"use client";

import { appBottomNavLabelClass } from "@/components/layout/appSurface";
import { isBottomNavItemActive } from "@/components/home/bottomNavActive";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  ScanLine,
  Target,
} from "lucide-react";

/** Primary daily workflow only — secondary pages live in the profile menu. */
const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    label: "Analysis",
    href: "/analysis",
    icon: ScanLine,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
  },
] as const;

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-hidden border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-4 gap-0.5 px-1 py-2 sm:gap-2 sm:px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isBottomNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 ${appBottomNavLabelClass} transition sm:rounded-2xl sm:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                active
                  ? "bg-slate-950 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
