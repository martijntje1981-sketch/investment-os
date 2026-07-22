export function HoldingsTodaySkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading holdings"
      className="rounded-[20px] border border-slate-200 bg-white p-4 md:p-5"
    >
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 max-w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-100" />
              <div className="ml-auto h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
