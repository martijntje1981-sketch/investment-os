"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  parseSectionHash,
  SECTION_DEEP_LINK_HIGHLIGHT_CLASS,
  SECTION_DEEP_LINK_HIGHLIGHT_MS,
} from "@/lib/navigation/deepLinks";
import { ANALYSIS_PATH, NEWS_PATH } from "@/lib/navigation/appRoutes";
import { resolveAnalysisDetailId } from "@/lib/services/analysisGlance";
import { resolveNewsDetailId } from "@/lib/services/newsGlance";
import {
  installSectionHashNavigation,
  subscribeSectionHash,
} from "@/lib/client/sectionHashNavigation";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scrolls to `document.location.hash` when present, with a brief highlight.
 * Safe to mount once app-wide; no-ops when the hash target is missing.
 */
export function scrollToSectionHash(options?: {
  hash?: string;
  retries?: number;
}): boolean {
  const hash = options?.hash ?? window.location.hash;
  const id = parseSectionHash(hash);
  if (!id) {
    return false;
  }

  if (
    (window.location.pathname === ANALYSIS_PATH &&
      resolveAnalysisDetailId(id)) ||
    (window.location.pathname === NEWS_PATH && resolveNewsDetailId(id))
  ) {
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
    return true;
  }

  const target = document.getElementById(id);
  if (!target) {
    return false;
  }

  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  target.scrollIntoView({ behavior, block: "start" });

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });

  target.classList.add(SECTION_DEEP_LINK_HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    target.classList.remove(SECTION_DEEP_LINK_HIGHLIGHT_CLASS);
  }, SECTION_DEEP_LINK_HIGHLIGHT_MS);

  return true;
}

/**
 * App-wide deep-link scroller for Dashboard summary destinations.
 * Retries briefly so late-mounted client sections can resolve.
 */
export function SectionDeepLinkEffect() {
  const pathname = usePathname();

  useEffect(() => {
    installSectionHashNavigation();
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const run = () => {
      if (cancelled) return;
      const ok = scrollToSectionHash();
      attempts += 1;
      if (!ok && attempts < maxAttempts && window.location.hash) {
        window.setTimeout(run, 80);
      }
    };

    // Defer past first paint / layout.
    const start = window.setTimeout(run, 0);

    const unsubscribe = subscribeSectionHash(() => {
      attempts = 0;
      run();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      unsubscribe();
    };
  }, [pathname]);

  return null;
}
