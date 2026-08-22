"use client";

/**
 * Auto-placed compact Four Questions nav for authenticated pages.
 * Renders nothing on utility routes.
 */

import { FourQuestionsCompactNav } from "@/components/fourQuestions/FourQuestionsCompactNav";

export function AuthenticatedFourQuestionsNav({
  className = "mt-4",
}: {
  className?: string;
}) {
  return <FourQuestionsCompactNav className={className} />;
}
