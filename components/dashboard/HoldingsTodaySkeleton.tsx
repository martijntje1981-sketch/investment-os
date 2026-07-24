import { appCardClass, appCardPaddingClass } from "@/components/layout/appSurface";

export function HoldingsTodaySkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading holdings"
      className={appCardClass}
    >
      <div className={appCardPaddingClass}>
        <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
      </div>
      <div className={`space-y-3 ${appCardPaddingClass} pt-0`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0"
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
