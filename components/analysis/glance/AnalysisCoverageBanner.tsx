import { AlertCircle } from "lucide-react";

export function AnalysisCoverageBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-amber-50/10 px-4 py-3 text-sm text-amber-100"
      data-testid="analysis-coverage"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
