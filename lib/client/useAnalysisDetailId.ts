"use client";

import { useSyncExternalStore } from "react";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import {
  resolveAnalysisDetailId,
  type AnalysisDetailId,
} from "@/lib/services/analysisGlance";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getSnapshot(): AnalysisDetailId | null {
  return resolveAnalysisDetailId(parseSectionHash(window.location.hash));
}

function getServerSnapshot(): AnalysisDetailId | null {
  return null;
}

export function useAnalysisDetailId(): AnalysisDetailId | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
