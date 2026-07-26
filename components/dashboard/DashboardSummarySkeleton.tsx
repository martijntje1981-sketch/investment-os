export function DashboardSummarySkeleton() {
  return (
    <div
      className="space-y-6 md:space-y-7"
      aria-busy="true"
      aria-label="Loading dashboard summary"
    >
      <div className="min-h-[420px] animate-pulse rounded-[28px] bg-slate-950/90 md:rounded-[32px]" />
      <div className="min-h-[132px] animate-pulse rounded-[24px] bg-slate-100" />
      <div
        className="grid min-w-0 gap-6 lg:grid-cols-2"
        aria-hidden
        data-skeleton="decision-briefing"
      >
        <div className="min-h-[168px] animate-pulse rounded-[24px] bg-slate-100" />
        <div className="min-h-[168px] animate-pulse rounded-[24px] bg-slate-100" />
      </div>
      <div
        className="grid min-w-0 gap-6 lg:grid-cols-2"
        aria-hidden
        data-skeleton="goal-dividend"
      >
        <div className="min-h-[180px] animate-pulse rounded-[24px] bg-slate-100" />
        <div className="min-h-[180px] animate-pulse rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}
