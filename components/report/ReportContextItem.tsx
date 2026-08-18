import type { PeriodIntelligenceContextItem } from "@/lib/services/periodIntelligence";

type ReportContextItemProps = {
  item: PeriodIntelligenceContextItem;
};

export function ReportContextItem({ item }: ReportContextItemProps) {
  const headline =
    item.href ? (
      <a
        href={item.href}
        className="mt-2 block text-[15px] font-semibold text-slate-950 underline-offset-2 hover:underline"
        {...(item.hrefExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {item.headline}
      </a>
    ) : (
      <p className="mt-2 text-[15px] font-semibold text-slate-950">{item.headline}</p>
    );

  return (
    <section className="border-t border-slate-100 px-5 py-5 sm:px-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {item.channelLabel}
      </p>
      {headline}
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.detail}</p>
    </section>
  );
}
