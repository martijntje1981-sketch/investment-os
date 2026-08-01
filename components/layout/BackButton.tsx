"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export const backButtonClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy";

export const lightBackButtonClass =
  "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-navy shadow-sm transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

function hasSameOriginHistory(): boolean {
  if (typeof window === "undefined") return false;
  if (window.history.length <= 1) return false;
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Shared back control for secondary / standalone pages.
 * Prefers in-app browser history; otherwise navigates to the dashboard.
 */
export function BackButton({
  fallbackHref = "/dashboard",
  variant = "dark",
  className,
  label = "Back",
}: {
  fallbackHref?: string;
  variant?: "dark" | "light";
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const resolvedClassName =
    className ?? (variant === "light" ? lightBackButtonClass : backButtonClass);

  return (
    <button
      type="button"
      onClick={() => {
        if (hasSameOriginHistory()) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={resolvedClassName}
      aria-label={label === "Back" ? "Go back" : label}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
