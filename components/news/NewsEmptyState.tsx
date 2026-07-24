import {
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import Link from "next/link";
import { Newspaper } from "lucide-react";

export function NewsEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <Newspaper className="mx-auto h-10 w-10 text-slate-300" />
      <h3 className={`mt-4 ${appSectionTitleClass}`}>{title}</h3>
      <p className={`mx-auto mt-3 max-w-xl ${appSectionSubtitleClass}`}>
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          {actionLabel}
        </button>
      ) : null}
      {actionHref && actionLabel && !onAction ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
