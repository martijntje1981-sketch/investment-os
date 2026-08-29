"use client";

import { useSyncExternalStore } from "react";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import {
  getSectionHash,
  getServerSectionHash,
  subscribeSectionHash,
} from "@/lib/client/sectionHashNavigation";
import {
  resolveNewsDetailId,
  type NewsDetailId,
} from "@/lib/services/newsGlance";

export function useNewsDetailId(): NewsDetailId | null {
  const hash = useSyncExternalStore(
    subscribeSectionHash,
    getSectionHash,
    getServerSectionHash,
  );
  return resolveNewsDetailId(parseSectionHash(hash));
}
