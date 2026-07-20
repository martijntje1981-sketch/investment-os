import { Sparkles } from "lucide-react";

export function DashboardInsightCard({ insight }: { insight: string }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            AI portfolio insight
          </p>
          <p className="text-sm text-slate-500">
            Based only on your saved holdings and verified moves
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-700">{insight}</p>
    </section>
  );
}
