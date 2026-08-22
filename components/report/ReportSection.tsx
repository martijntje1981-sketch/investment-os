import Link from "next/link";

import { ReportEvidenceList } from "@/components/report/ReportEvidenceList";
import type { PersonalReportAccent, PersonalReportSectionView } from "@/lib/services/periodIntelligence";

const ACCENT: Record<PersonalReportAccent, string> = {
  cyan: "border-l-q1",
  violet: "border-l-q2",
  amber: "border-l-amber-600",
  teal: "border-l-q4",
  slate: "border-l-slate-400",
};

const EYEBROW: Record<PersonalReportAccent, string> = {
  cyan: "text-q1-strong",
  violet: "text-q2-strong",
  amber: "text-amber-900",
  teal: "text-q4-strong",
  slate: "text-slate-700",
};

type ReportSectionProps = {
  section: PersonalReportSectionView;
};

export function ReportSection({ section }: ReportSectionProps) {
  const title = (
    <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${EYEBROW[section.accent]}`}>
      {section.title}
    </p>
  );

  return (
    <section className={`border-t border-slate-100 border-l-4 px-5 py-5 sm:px-7 ${ACCENT[section.accent]}`}>
      {section.href ? (
        <Link
          href={section.href}
          className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {title}
        </Link>
      ) : (
        title
      )}
      {section.href ? (
        <Link
          href={section.href}
          className="mt-2 block text-[16px] font-semibold leading-snug tracking-[-0.02em] text-slate-950 underline-offset-2 hover:underline"
        >
          {section.headline}
        </Link>
      ) : (
        <p className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-slate-950">
          {section.headline}
        </p>
      )}
      {section.whyItMatters ? (
        <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-800">Why it matters. </span>
          {section.whyItMatters}
        </p>
      ) : null}
      <ReportEvidenceList items={section.evidence} />
    </section>
  );
}
