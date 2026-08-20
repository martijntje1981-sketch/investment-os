export function DashboardSummarySkeleton() {
  return (
    <div
      className="space-y-6 md:space-y-8"
      aria-busy="true"
      aria-label="Loading dashboard summary"
    >
      <div className="min-h-[220px] animate-pulse rounded-[28px] border border-sky-200/80 bg-sky-50 md:min-h-[240px] md:rounded-[32px]" />
      <div
        className="grid min-w-0 gap-4 md:gap-5 lg:grid-cols-2"
        aria-hidden
        data-skeleton="decision-briefing"
      >
        <div className="min-h-[140px] animate-pulse rounded-[24px] bg-slate-100" />
        <div className="min-h-[140px] animate-pulse rounded-[24px] bg-slate-100" />
      </div>
      <div
        className="min-h-[160px] animate-pulse rounded-[24px] bg-slate-100"
        aria-hidden
        data-skeleton="holdings"
      />
      <div
        className="grid min-w-0 gap-4 md:gap-5 lg:grid-cols-2"
        aria-hidden
        data-skeleton="health-story"
      >
        <div className="min-h-[140px] animate-pulse rounded-[24px] bg-slate-100" />
        <div className="min-h-[140px] animate-pulse rounded-[24px] bg-slate-100" />
      </div>
      <div
        className="min-w-0 space-y-3 rounded-[24px] border border-slate-100 bg-white p-4 md:p-5"
        aria-hidden
        data-skeleton="portfolio-exposure"
      >
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
      <div
        className="grid min-w-0 gap-6 lg:grid-cols-2"
        aria-hidden
        data-skeleton="goal-dividend"
      >
        <div className="min-h-[160px] animate-pulse rounded-[24px] bg-slate-100" />
        <div className="min-h-[160px] animate-pulse rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}
