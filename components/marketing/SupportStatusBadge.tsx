import type { InstrumentSupportStatusId } from "@/lib/content/supportedInstrumentsContent";
import { getInstrumentSupportStatusLabel } from "@/lib/content/supportedInstrumentsContent";

const STATUS_STYLES: Record<
  InstrumentSupportStatusId,
  string
> = {
  supported: "bg-emerald-50 text-emerald-800 border-emerald-200",
  supported_via_conversion: "bg-q1-soft text-q1-deep border-q1/30",
  pending_match: "bg-amber-50 text-amber-900 border-amber-200",
  not_supported: "bg-slate-100 text-slate-700 border-slate-200",
  live_price_unavailable: "bg-q2-soft text-q2-deep border-q2/30",
};

type SupportStatusBadgeProps = {
  status: InstrumentSupportStatusId;
  className?: string;
};

export function SupportStatusBadge({ status, className = "" }: SupportStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${STATUS_STYLES[status]} ${className}`}
    >
      {getInstrumentSupportStatusLabel(status)}
    </span>
  );
}
