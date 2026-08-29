"use client";

import { useSyncExternalStore } from "react";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import {
  getSectionHash,
  getServerSectionHash,
  subscribeSectionHash,
} from "@/lib/client/sectionHashNavigation";
import {
  resolveAnalysisDetailId,
  type AnalysisDetailId,
} from "@/lib/services/analysisGlance";

export function useAnalysisDetailId(): AnalysisDetailId | null {
  const hash = useSyncExternalStore(
    subscribeSectionHash,
    getSectionHash,
    getServerSectionHash,
  );
  return resolveAnalysisDetailId(parseSectionHash(hash));
}
