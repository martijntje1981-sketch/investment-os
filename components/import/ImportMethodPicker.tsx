import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, FileSpreadsheet, Pencil } from "lucide-react";

type ImportMethodPickerProps = {
  onSpreadsheetClick: () => void;
};

export function ImportMethodPicker({ onSpreadsheetClick }: ImportMethodPickerProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <ImportMethodCard
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title="Excel or CSV"
        description="Upload a broker export. You review holdings before import."
        actionLabel="Choose file"
        onClick={onSpreadsheetClick}
        prominent
      />
      <ImportMethodCard
        icon={<Pencil className="h-6 w-6" />}
        title="Manual entry"
        description="Search and add investments yourself."
        actionLabel="Add holdings manually"
        href="/portfolio?add=investment"
      />
      <ImportMethodCard
        icon={<Banknote className="h-6 w-6" />}
        title="Cash entry"
        description="Record cash balances alongside investments."
        actionLabel="Add cash"
        href="/portfolio?add=cash"
      />
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
    ? "mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-navy sm:w-auto"
    : "mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-brand-navy sm:w-auto";

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
      <h2 className="mt-4 text-base font-bold tracking-[-0.015em] text-slate-950">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
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
