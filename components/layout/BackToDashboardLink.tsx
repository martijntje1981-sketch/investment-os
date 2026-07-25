import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const backToDashboardLinkClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function BackToDashboardLink() {
  return (
    <Link href="/dashboard" className={backToDashboardLinkClass}>
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      Back to dashboard
    </Link>
  );
}
