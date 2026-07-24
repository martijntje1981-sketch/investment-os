"use client";

import {
  appBottomNavFeaturedLabelClass,
  appBottomNavLabelClass,
} from "@/components/layout/appSurface";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  Radio,
  ScanLine,
  Target,
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    featured: false,
  },
  {
    label: "News",
    href: "/news",
    icon: Radio,
    featured: true,
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: ChartNoAxesColumnIncreasing,
    featured: false,
  },
  {
    label: "Analysis",
    href: "/analysis",
    icon: ScanLine,
    featured: false,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
    featured: false,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-full overflow-hidden border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-0.5 px-1 py-2 sm:gap-2 sm:px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const featured = item.featured;

          const className = featured
            ? `relative -mt-1 flex min-h-[64px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-2xl px-0.5 ${appBottomNavFeaturedLabelClass} transition sm:mt-0 sm:min-h-[62px] sm:px-2 ${
                active
                  ? "bg-slate-950 text-white shadow-xl ring-2 ring-violet-500/30"
                  : "border border-slate-300 bg-white text-slate-950 shadow-md hover:bg-slate-50"
              }`
            : `flex min-h-[58px] min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 ${appBottomNavLabelClass} transition sm:rounded-2xl sm:px-2 ${
                active
                  ? "bg-slate-950 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`;

          return (
            <Link key={item.href} href={item.href} className={className}>
              {featured && !active ? (
                <span className="absolute -top-1 right-2 h-2 w-2 rounded-full bg-violet-600" />
              ) : null}
              <Icon
                className={`mb-1 ${featured ? "h-6 w-6" : "h-5 w-5"}`}
                strokeWidth={featured ? 2.2 : 1.8}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
