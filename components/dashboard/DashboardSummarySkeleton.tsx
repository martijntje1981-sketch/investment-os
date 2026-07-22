export function DashboardSummarySkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading dashboard summary"
    >
      <div className="min-h-[132px] animate-pulse rounded-[20px] bg-slate-200 lg:col-span-2" />
      <div className="min-h-[132px] animate-pulse rounded-[20px] bg-slate-100" />
      <div className="min-h-[132px] animate-pulse rounded-[20px] bg-slate-100" />
    </div>
  );
}
