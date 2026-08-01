import Link from "next/link";
import { Banknote, FileSpreadsheet, Pencil } from "lucide-react";

type ImportMethodPickerProps = {
  onSpreadsheetClick: () => void;
};

export function ImportMethodPicker({ onSpreadsheetClick }: ImportMethodPickerProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <ImportMethodCard
        icon={<Pencil className="h-6 w-6" />}
        title="Manual entry"
        description="Add investments yourself on the portfolio page."
        actionLabel="Open portfolio"
        href="/portfolio"
        prominent
      />
      <ImportMethodCard
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title="Excel or CSV"
        description="Import holdings from a spreadsheet export."
        actionLabel="Choose file"
        onClick={onSpreadsheetClick}
      />
      <ImportMethodCard
        icon={<Banknote className="h-6 w-6" />}
        title="Cash entry"
        description="Record cash balances alongside your investments."
        actionLabel="Add cash"
        href="/portfolio"
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
  icon: React.ReactNode;
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
      className={`rounded-[24px] border bg-white p-6 shadow-sm ${
        prominent ? "border-slate-950 ring-1 ring-slate-950/10" : "border-slate-200"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h2 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {href ? (
        <Link href={href} className={buttonClass}>
          {actionLabel}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={buttonClass}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}
