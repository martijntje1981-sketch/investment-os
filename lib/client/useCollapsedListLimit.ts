/**
 * Mobile-first collapsed list limit for Dashboard holdings.
 * md+ prefers a slightly larger compact count.
 */

"use client";

import { useSyncExternalStore } from "react";

const MOBILE_LIMIT = 2;
const DESKTOP_LIMIT = 3;
const MD_QUERY = "(min-width: 768px)";

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const media = window.matchMedia(MD_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot(): number {
  if (typeof window === "undefined" || !window.matchMedia) {
    return MOBILE_LIMIT;
  }
  return window.matchMedia(MD_QUERY).matches ? DESKTOP_LIMIT : MOBILE_LIMIT;
}

function getServerSnapshot(): number {
  return MOBILE_LIMIT;
}

export function useCollapsedListLimit(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const HOLDINGS_COLLAPSE_MOBILE_LIMIT = MOBILE_LIMIT;
export const HOLDINGS_COLLAPSE_DESKTOP_LIMIT = DESKTOP_LIMIT;
