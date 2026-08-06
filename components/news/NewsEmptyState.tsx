import {
  appSectionSubtitleClass,
  appSectionTitleClass,
  appSolidButtonClass,
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
    <section className="rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-8 text-center md:rounded-[28px] md:px-8 md:py-10">
      <Newspaper className="mx-auto h-9 w-9 text-slate-300" aria-hidden />
      <h3 className={`mt-4 ${appSectionTitleClass}`}>{title}</h3>
      <p className={`mx-auto mt-2 max-w-xl ${appSectionSubtitleClass}`}>
        {description}
      </p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={`mt-5 ${appSolidButtonClass}`}>
          {actionLabel}
        </button>
      ) : null}
      {actionHref && actionLabel && !onAction ? (
        <Link href={actionHref} className={`mt-5 ${appSolidButtonClass}`}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
