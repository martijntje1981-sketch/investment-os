"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesColumnIncreasing,
  Upload,
  Newspaper,
  Target,
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/",
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2 px-4 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl px-2 text-xs font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-lg"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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