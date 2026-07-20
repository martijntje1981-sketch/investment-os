import { Loader2 } from "lucide-react";

type ImportProcessingStateProps = {
  message: string;
  step?: string;
};

export function ImportProcessingState({
  message,
  step,
}: ImportProcessingStateProps) {
  return (
    <div
      className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-700" />
        <div>
          {step ? (
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
              {step}
            </p>
          ) : null}
          <p className="mt-1 text-sm font-bold text-blue-900">{message}</p>
        </div>
      </div>
    </div>
  );
}
