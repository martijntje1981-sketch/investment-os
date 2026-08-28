"use client";

import { useSyncExternalStore } from "react";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import {
  resolveNewsDetailId,
  type NewsDetailId,
} from "@/lib/services/newsGlance";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getSnapshot(): NewsDetailId | null {
  return resolveNewsDetailId(parseSectionHash(window.location.hash));
}

function getServerSnapshot(): NewsDetailId | null {
  return null;
}

export function useNewsDetailId(): NewsDetailId | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
