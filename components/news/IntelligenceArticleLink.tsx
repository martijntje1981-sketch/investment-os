import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";

const VARIANT_STYLES = {
  light: {
    link: "text-slate-950 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
    meta: "text-slate-500",
    label: "text-violet-700",
  },
  dark: {
    link: "text-slate-100 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    meta: "text-slate-400",
    label: "text-violet-200",
  },
} as const;

export function IntelligenceArticleLink({
  href,
  sourceName,
  linkLabel = "Read article",
  variant = "light",
  className = "",
  compact = false,
  children,
}: {
  href: string | null | undefined;
  sourceName?: string | null;
  linkLabel?: string;
  variant?: "light" | "dark";
  className?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const styles = VARIANT_STYLES[variant];
  const textClass = compact
    ? "text-sm font-semibold leading-relaxed"
    : "text-base font-semibold leading-snug";

  if (!isValidArticleUrl(href)) {
    return (
      <span className={`${textClass} ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={href!.trim()}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex min-h-[44px] w-full min-w-0 flex-col justify-center rounded-lg px-1 py-1 transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${styles.link} ${className}`}
    >
      <span className={`${textClass} group-hover:underline`}>
        {children}
      </span>
      <span
        className={`mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${styles.meta}`}
      >
        {sourceName?.trim() ? <span>{sourceName.trim()}</span> : null}
        <span className={`inline-flex items-center gap-1 font-semibold ${styles.label}`}>
          {linkLabel}
          <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        </span>
      </span>
    </a>
  );
}

export function IntelligenceBulletRow({
  bullet,
  variant = "light",
  linkLabel = "Read article",
}: {
  bullet: { text: string; canonicalUrl?: string | null; sourceName?: string | null };
  variant?: "light" | "dark";
  linkLabel?: string;
}) {
  if (!isValidArticleUrl(bullet.canonicalUrl)) {
    return <span className="text-sm leading-relaxed">{bullet.text}</span>;
  }

  return (
    <IntelligenceArticleLink
      href={bullet.canonicalUrl}
      sourceName={bullet.sourceName}
      linkLabel={linkLabel}
      variant={variant}
      compact
    >
      {bullet.text}
    </IntelligenceArticleLink>
  );
}

export function MissedItemLink({
  headline,
  sourceUrl,
  sourceName,
  variant = "light",
}: {
  headline: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
  variant?: "light" | "dark";
}) {
  if (!isValidArticleUrl(sourceUrl)) {
    return <span className="text-sm font-semibold leading-relaxed">{headline}</span>;
  }

  return (
    <IntelligenceArticleLink
      href={sourceUrl}
      sourceName={sourceName}
      linkLabel="Open source"
      variant={variant}
      compact
    >
      {headline}
    </IntelligenceArticleLink>
  );
}
