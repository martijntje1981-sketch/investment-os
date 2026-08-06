/**
 * Optional local preference for Dashboard section expand/collapse.
 * Defaults compact; hydrates from localStorage after mount (no SSR mismatch).
 */

"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "tobailey-dashboard-section-expanded:v1:";

function storageKey(sectionKey: string): string {
  return `${STORAGE_PREFIX}${sectionKey}`;
}

function readStored(sectionKey: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(sectionKey));
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeStored(sectionKey: string, expanded: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(sectionKey), expanded ? "1" : "0");
  } catch {
    // Ignore quota / private-mode failures — in-memory state still works.
  }
}

export function useDashboardSectionExpanded(
  sectionKey: string,
  defaultExpanded = false,
): {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
} {
  const [expanded, setExpandedState] = useState(defaultExpanded);

  useEffect(() => {
    const stored = readStored(sectionKey);
    if (stored != null) {
      setExpandedState(stored);
    }
  }, [sectionKey]);

  const setExpanded = useCallback(
    (next: boolean) => {
      setExpandedState(next);
      writeStored(sectionKey, next);
    },
    [sectionKey],
  );

  return { expanded, setExpanded };
}

export const DASHBOARD_SECTION_EXPANDED_STORAGE_PREFIX = STORAGE_PREFIX;
