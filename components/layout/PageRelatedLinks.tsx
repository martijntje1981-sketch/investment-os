import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";

export type RelatedLink = {
  href: string;
  label: string;
};

type PageRelatedLinksProps = {
  links: readonly RelatedLink[];
  /** Optional quiet purpose line for the current page. */
  purpose?: string;
  className?: string;
};

/**
 * Compact cross-page connections — never a dead end.
 * Mobile-first row of text links; no card chrome.
 */
export function PageRelatedLinks({
  links,
  purpose,
  className = "",
}: PageRelatedLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Related"
      className={`min-w-0 ${className}`.trim()}
      data-testid="page-related-links"
    >
      {purpose ? (
        <p className={`${appSectionMetaClass} mb-2`}>{purpose}</p>
      ) : null}
      <p className={appSectionLabelClass}>Related</p>
      <ul className="mt-2 flex flex-col gap-1 min-[390px]:flex-row min-[390px]:flex-wrap min-[390px]:gap-x-4 min-[390px]:gap-y-1">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-brand-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {link.label}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
