type ImportProgressStepsProps = {
  phase: "choose" | "processing" | "ready" | "success";
};

const STEPS = [
  { id: "upload", label: "Upload" },
  { id: "review", label: "Review" },
  { id: "import", label: "Import" },
] as const;

function activeIndex(phase: ImportProgressStepsProps["phase"]): number {
  if (phase === "choose" || phase === "processing") return 0;
  if (phase === "ready") return 1;
  return 2;
}

export function ImportProgressSteps({ phase }: ImportProgressStepsProps) {
  const current = activeIndex(phase);

  return (
    <nav
      className="mb-5"
      aria-label="Import progress"
    >
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, index) => {
          const done = index < current || phase === "success";
          const active = index === current && phase !== "success";
          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 items-center gap-2"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${
                  done || active
                    ? "bg-brand text-brand-navy"
                    : "bg-slate-100 text-slate-500"
                }`}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span
                className={`truncate text-[13px] font-semibold ${
                  done || active ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {step.label}
                <span className="sr-only">
                  {done ? ", completed" : active ? ", current step" : ", upcoming"}
                </span>
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className={`ml-auto hidden h-px w-full max-w-[48px] sm:block ${
                    done ? "bg-brand" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
