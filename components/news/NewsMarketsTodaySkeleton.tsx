import { marketsTodayRegionGridClass } from "@/components/news/marketsTodayVisuals";

function PulseSkeleton() {
  return (
    <div className="min-h-[132px] animate-pulse rounded-[18px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-3.5 sm:px-5">
      <div className="h-3 w-40 rounded bg-slate-200" />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        <div className="h-9 rounded-lg bg-slate-100" />
        <div className="h-9 rounded-lg bg-slate-100" />
        <div className="h-9 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-3 h-9 rounded-lg bg-slate-100" />
    </div>
  );
}

function RegionCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className={`min-h-[196px] animate-pulse rounded-[16px] border border-slate-200 bg-slate-50/80 px-3.5 py-3.5 ${marketsTodayRegionGridClass(index)}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-3 h-9 rounded-lg bg-slate-100" />
      <div className="mt-2.5 h-14 rounded-xl bg-slate-100" />
      <div className="mt-1.5 h-11 rounded-xl bg-slate-100/80" />
    </div>
  );
}

export function NewsMarketsTodaySkeleton() {
  return (
    <section
      className="min-w-0 space-y-4"
      aria-busy="true"
      aria-label="Loading Markets Today"
    >
      <div>
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <PulseSkeleton />
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <RegionCardSkeleton key={index} index={index} />
        ))}
      </div>
    </section>
  );
}
