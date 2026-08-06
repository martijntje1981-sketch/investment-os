import type { InstrumentSupportStatusId } from "@/lib/content/supportedInstrumentsContent";
import { getInstrumentSupportStatusLabel } from "@/lib/content/supportedInstrumentsContent";

const STATUS_STYLES: Record<
  InstrumentSupportStatusId,
  string
> = {
  supported: "bg-emerald-50 text-emerald-800 border-emerald-200",
  supported_via_conversion: "bg-blue-50 text-blue-800 border-blue-200",
  pending_match: "bg-amber-50 text-amber-900 border-amber-200",
  not_supported: "bg-slate-100 text-slate-700 border-slate-200",
  live_price_unavailable: "bg-violet-50 text-violet-900 border-violet-200",
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
