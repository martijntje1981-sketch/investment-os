/**
 * Mobile-first collapsed list limit for Dashboard holdings.
 * md+ prefers a slightly larger compact count.
 */

"use client";

import { useSyncExternalStore } from "react";

const MOBILE_LIMIT = 2;
const DESKTOP_LIMIT = 3;
/** Inline expand ceiling before directing users to the Portfolio page. */
const MOBILE_EXPANDED_MAX = 6;
const DESKTOP_EXPANDED_MAX = 8;
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

function getExpandedSnapshot(): number {
  if (typeof window === "undefined" || !window.matchMedia) {
    return MOBILE_EXPANDED_MAX;
  }
  return window.matchMedia(MD_QUERY).matches
    ? DESKTOP_EXPANDED_MAX
    : MOBILE_EXPANDED_MAX;
}

function getExpandedServerSnapshot(): number {
  return MOBILE_EXPANDED_MAX;
}

export function useCollapsedListLimit(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useExpandedListLimit(): number {
  return useSyncExternalStore(
    subscribe,
    getExpandedSnapshot,
    getExpandedServerSnapshot,
  );
}

export const HOLDINGS_COLLAPSE_MOBILE_LIMIT = MOBILE_LIMIT;
export const HOLDINGS_COLLAPSE_DESKTOP_LIMIT = DESKTOP_LIMIT;
export const HOLDINGS_EXPANDED_MOBILE_MAX = MOBILE_EXPANDED_MAX;
export const HOLDINGS_EXPANDED_DESKTOP_MAX = DESKTOP_EXPANDED_MAX;
