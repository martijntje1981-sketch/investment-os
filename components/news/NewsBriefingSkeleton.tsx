export function NewsBriefingSkeleton() {
  return (
    <div
      className="min-w-0 space-y-4"
      aria-busy="true"
      aria-label="Loading news briefing"
    >
      <div className="h-28 animate-pulse rounded-[20px] bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-[16px] bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
