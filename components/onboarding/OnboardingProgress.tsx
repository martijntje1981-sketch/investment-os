import { PORTFOLIO_SETUP_STEPS } from "@/lib/client/portfolioSetup";

type OnboardingProgressProps = {
  currentStep: 1 | 2 | 3 | 4;
};

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <ol
      className="flex flex-wrap gap-2"
      aria-label="Onboarding progress"
    >
      {PORTFOLIO_SETUP_STEPS.map((item) => {
        const done = item.step < currentStep;
        const current = item.step === currentStep;
        return (
          <li
            key={item.step}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${
              current
                ? "bg-brand-soft text-brand-navy ring-1 ring-brand/30"
                : done
                  ? "bg-white text-slate-600"
                  : "bg-white/70 text-slate-400"
            }`}
          >
            <span aria-hidden="true">{item.step}</span>
            <span>{item.title}</span>
          </li>
        );
      })}
    </ol>
  );
}
