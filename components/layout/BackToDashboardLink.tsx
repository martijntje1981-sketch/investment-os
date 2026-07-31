import { BackButton, backButtonClass } from "@/components/layout/BackButton";

/** @deprecated Prefer BackButton — kept for existing imports/tests. */
export const backToDashboardLinkClass = backButtonClass;

/** Renders the shared Back control (history when available, else dashboard). */
export function BackToDashboardLink() {
  return <BackButton fallbackHref="/dashboard" />;
}
