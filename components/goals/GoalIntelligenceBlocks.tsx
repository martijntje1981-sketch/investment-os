import type {
  GoalCoachResult,
  GoalCurrencyMilestone,
  GoalScenarioComparison,
} from "@/lib/services/goals/goalCoach";

export function GoalCoachCard({ coach }: { coach: GoalCoachResult }) {
  return (
    <section
      aria-labelledby="goal-coach-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
    >
      <p
        id="goal-coach-heading"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"
      >
        Goal Coach
      </p>
      <p className="mt-2 text-base font-semibold leading-snug text-white">
        {coach.headline}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{coach.body}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{coach.reason}</p>
      {coach.actionLine ? (
        <p className="mt-2 text-sm font-semibold text-violet-200">{coach.actionLine}</p>
      ) : null}
    </section>
  );
}

export function GoalMilestonesRow({
  milestones,
}: {
  milestones: GoalCurrencyMilestone[];
}) {
  if (milestones.length === 0) return null;

  return (
    <section aria-labelledby="goal-milestones-heading" className="space-y-2">
      <p
        id="goal-milestones-heading"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"
      >
        Milestones
      </p>
      <div className="flex flex-wrap gap-2">
        {milestones.map((milestone) => (
          <span
            key={`${milestone.label}-${milestone.value}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              milestone.reached
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/[0.03] text-slate-300"
            }`}
          >
            {milestone.label}
            {milestone.reached ? " ✔" : ""}
          </span>
        ))}
      </div>
    </section>
  );
}

export function GoalWhatIfCard({
  comparison,
}: {
  comparison: GoalScenarioComparison;
}) {
  return (
    <section
      aria-labelledby="goal-what-if-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
    >
      <p
        id="goal-what-if-heading"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"
      >
        What if
      </p>
      <ul className="mt-3 space-y-2">
        {comparison.rows.map((row) => (
          <li
            key={row.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="text-sm font-semibold text-slate-100">{row.label}</span>
            <span className="text-sm text-slate-300">{row.completionLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GoalInsightCard({ insight }: { insight: string }) {
  return (
    <section
      aria-labelledby="goal-insight-heading"
      className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 sm:p-5"
    >
      <p
        id="goal-insight-heading"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-200"
      >
        Insight
      </p>
      <p className="mt-2 text-sm leading-relaxed text-violet-50">{insight}</p>
    </section>
  );
}
