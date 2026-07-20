import { Sparkles } from "lucide-react";

export function DashboardInsightCard({ insight }: { insight: string }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[28px] md:p-6">
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 md:h-11 md:w-11">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            AI portfolio insight
          </p>
          <p className="text-sm text-slate-500">
            Based only on your saved holdings and verified moves
          </p>
        </div>
      </div>
      <p className="mt-3.5 text-sm leading-6 text-slate-700 md:mt-5 md:leading-7">{insight}</p>
    </section>
  );
}
