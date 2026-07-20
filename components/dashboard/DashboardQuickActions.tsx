import Link from "next/link";
import {
  BriefcaseBusiness,
  Goal,
  Newspaper,
  Upload,
} from "lucide-react";

const actions = [
  {
    href: "/upload",
    label: "Upload Portfolio",
    icon: Upload,
  },
  {
    href: "/news",
    label: "News",
    icon: Newspaper,
  },
  {
    href: "/goals",
    label: "Goals",
    icon: Goal,
  },
  {
    href: "/portfolio",
    label: "Add Holding",
    icon: BriefcaseBusiness,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        Quick actions
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-black text-slate-950">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
