import {
  formatMarketUpdateTime,
  getMarketStatuses,
} from "@/lib/client/marketStatus";

export function DashboardMarketStatus({
  lastUpdatedAt,
}: {
  lastUpdatedAt: string | null;
}) {
  const statuses = getMarketStatuses();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
        Market status
      </p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
        Trading hours
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {statuses.map((market) => {
          const isOpen =
            market.status === "open" || market.status === "always-open";

          return (
            <div
              key={market.label}
              className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{market.label}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {market.statusLabel}
                  </p>
                </div>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isOpen ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Latest market update:{" "}
        <span className="font-semibold text-slate-700">
          {formatMarketUpdateTime(lastUpdatedAt)}
        </span>
      </p>
    </section>
  );
}
