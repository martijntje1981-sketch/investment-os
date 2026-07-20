import Link from "next/link";
import { FileImage, FileSpreadsheet, Pencil } from "lucide-react";

type ImportMethodPickerProps = {
  onScreenshotClick: () => void;
  onSpreadsheetClick: () => void;
};

export function ImportMethodPicker({
  onScreenshotClick,
  onSpreadsheetClick,
}: ImportMethodPickerProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <ImportMethodCard
        icon={<FileImage className="h-6 w-6" />}
        title="Screenshot"
        description="Upload a broker portfolio screenshot. AI reads every visible position."
        actionLabel="Choose screenshot"
        onClick={onScreenshotClick}
      />
      <ImportMethodCard
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title="Excel or CSV"
        description="Import holdings from a spreadsheet export."
        actionLabel="Choose file"
        onClick={onSpreadsheetClick}
      />
      <ImportMethodCard
        icon={<Pencil className="h-6 w-6" />}
        title="Manual entry"
        description="Add investments or cash yourself."
        actionLabel="Open portfolio"
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
  href?: string;
}) {
  const buttonClass =
    "mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white sm:w-auto";

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
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
