"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  FOUR_QUESTIONS,
  resolveFourQuestionsPagePlacement,
  type FourQuestionDefinition,
} from "@/lib/services/fourQuestions/catalog";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";

type FourQuestionsCompactNavProps = {
  /** Override pathname (tests / story). */
  pathname?: string;
  /** Force active question; otherwise derived from route. */
  activeOverride?: FourQuestionId | null;
  className?: string;
};

/**
 * Shared compact Four Questions navigation for authenticated product pages.
 * Each question keeps its color identity; active is richer, not white-only.
 */
export function FourQuestionsCompactNav({
  pathname: pathnameProp,
  activeOverride,
  className = "",
}: FourQuestionsCompactNavProps) {
  const pathnameHook = usePathname();
  const pathname = pathnameProp ?? pathnameHook ?? "";
  const placement = resolveFourQuestionsPagePlacement(pathname);

  if (!placement.show) return null;

  const active =
    activeOverride !== undefined ? activeOverride : placement.active;

  return (
    <nav
      aria-label="Four questions"
      className={`min-w-0 ${className}`}
      data-testid="four-questions-compact-nav"
      data-active={active ?? "none"}
      data-placement={placement.reason}
    >
      <ul className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {FOUR_QUESTIONS.map((item) => (
          <li key={item.id} className="min-w-0">
            <QuestionNavLink
              item={item}
              isActive={active === item.id}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function QuestionNavLink({
  item,
  isActive,
}: {
  item: FourQuestionDefinition;
  isActive: boolean;
}) {
  const v = item.visual;
  return (
    <Link
      href={item.hubPath}
      aria-current={isActive ? "page" : undefined}
      data-testid={`four-questions-nav-${item.id}`}
      data-active={isActive ? "true" : "false"}
      className={`flex min-h-11 flex-col items-start justify-center rounded-xl border px-1.5 py-1.5 transition sm:px-2.5 sm:py-2 focus-visible:outline-none focus-visible:ring-2 ${v.ring} ${
        isActive ? v.navActive : `${v.navIdle} ${v.hover}`
      }`}
    >
      <span
        className={`text-[10px] font-bold tabular-nums tracking-[0.08em] ${
          isActive ? v.navNumberActive : v.navNumberIdle
        }`}
      >
        {item.numberLabel}
      </span>
      <span
        className={`mt-0.5 truncate text-[11px] font-semibold leading-tight tracking-[-0.02em] sm:text-[12px] ${
          isActive ? v.navLabelActive : v.navLabelIdle
        }`}
      >
        {item.shortNavLabel}
      </span>
      {isActive ? (
        <span className="sr-only">Current question</span>
      ) : null}
    </Link>
  );
}
