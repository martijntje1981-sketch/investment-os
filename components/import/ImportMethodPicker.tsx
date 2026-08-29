import type { ReactNode } from "react";
import Link from "next/link";
import { FileSpreadsheet, Pencil, Sparkles } from "lucide-react";

import { DEMO_PORTFOLIO_ENABLED, DEMO_PORTFOLIO_HREF } from "@/lib/client/portfolioSetup";

type ImportMethodPickerProps = {
  onSpreadsheetClick: () => void;
};

export function ImportMethodPicker({ onSpreadsheetClick }: ImportMethodPickerProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ImportMethodCard
          icon={<FileSpreadsheet className="h-6 w-6" />}
          title="Upload portfolio"
          description="Drop a CSV or Excel file (.csv, .xlsx). Images and PDFs are not supported."
          actionLabel="Choose file"
          onClick={onSpreadsheetClick}
          prominent
        />
        <ImportMethodCard
          icon={<Pencil className="h-6 w-6" />}
          title="Add manually"
          description="Search an instrument, enter quantity, then add."
          actionLabel="Add holdings"
          href="/portfolio?add=investment"
        />
      </div>
      {DEMO_PORTFOLIO_ENABLED ? (
        <p className="text-center text-[16px] font-medium text-slate-600">
          <Link
            href={DEMO_PORTFOLIO_HREF}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Explore Demo Portfolio
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function ImportMethodCard({
  icon,
  title,
  description,
  actionLabel,
  onClick,
  href,
  prominent = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
  href?: string;
  prominent?: boolean;
}) {
  const buttonClass = prominent
    ? "mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-[16px] font-bold text-brand-navy sm:w-auto"
    : "mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] font-bold text-brand-navy sm:w-auto";

  return (
    <article
      className={`min-w-0 rounded-[24px] border bg-white p-5 shadow-sm md:rounded-[28px] md:p-6 ${
        prominent ? "border-brand/30" : "border-slate-200/80"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          prominent ? "bg-brand-soft text-brand-navy" : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </div>
      <h2 className="mt-4 text-[1.125rem] font-bold tracking-[-0.015em] text-slate-950">
        {title}
      </h2>
      <p className="mt-1.5 text-[16px] leading-relaxed text-slate-600">{description}</p>
      {onClick ? (
        <button type="button" onClick={onClick} className={buttonClass}>
          {actionLabel}
        </button>
      ) : href ? (
        <Link href={href} className={buttonClass}>
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}
