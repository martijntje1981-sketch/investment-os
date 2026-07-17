"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  LayoutDashboard,
  ChartNoAxesColumnIncreasing,
  Upload,
  Newspaper,
  Target,
} from "lucide-react";

const navigationItems = [
  {
    label: "Home",
    href: "/",
    icon: House,
  },
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
    label: "Upload",
    href: "/upload",
    icon: Upload,
  },
  {
    label: "Briefing",
    href: "/briefing",
    icon: Newspaper,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-hidden border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-6 gap-0.5 px-1 py-2 sm:gap-2 sm:px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const className = `flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 text-[10px] font-semibold transition sm:rounded-2xl sm:px-2 sm:text-xs ${
            isActive(item.href)
              ? "bg-slate-950 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          }`;

          if (item.href === "/") {
            return (
              <Link
                key={item.href}
                href="/?view=home"
                prefetch={false}
                onClick={(event) => {
                  event.preventDefault();
                  window.location.assign("/?view=home");
                }}
                aria-label="Open Home"
                className={className}
              >
                <Icon className="mb-1 h-5 w-5" strokeWidth={1.8} />
                <span>Home</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={className}
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