export function DashboardSummarySkeleton() {
  return (
    <div
      className="space-y-7 md:space-y-10"
      aria-busy="true"
      aria-label="Loading dashboard summary"
    >
      <div className="min-h-[220px] animate-pulse rounded-[24px] bg-slate-200 md:rounded-[28px]" />
      <div className="min-h-[132px] animate-pulse rounded-[24px] bg-slate-100" />
    </div>
  );
}
