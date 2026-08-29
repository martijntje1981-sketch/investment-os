/**
 * Shared same-document hash / deep-link navigation.
 *
 * Next.js <Link> updates the URL with history.pushState. That does not fire
 * hashchange or popstate, so React subscribers that only listen to those
 * events never reconcile. Direct load / refresh still works because the
 * first render reads window.location.hash.
 *
 * This module:
 * 1. Patches History.prototype push/replace so hash-only client navigations notify.
 * 2. Intercepts same-document hash clicks before Next.js starts an RSC navigation.
 * 3. Still listens to native hashchange and popstate (Back/Forward).
 */

import { parseSectionHash } from "@/lib/navigation/deepLinks";

export const SECTION_LOCATION_EVENT = "tobailey:section-location";

type Listener = () => void;

const listeners = new Set<Listener>();

let installed = false;
let lastHref = "";
let nativePushState: History["pushState"] | null = null;
let nativeReplaceState: History["replaceState"] | null = null;

function currentHref(): string {
  return window.location.href;
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
  window.dispatchEvent(new Event(SECTION_LOCATION_EVENT));
}

function notifyIfChanged() {
  const href = currentHref();
  if (href === lastHref) return;
  lastHref = href;
  emit();
}

function patchHistory() {
  if (nativePushState && nativeReplaceState) return;

  nativePushState = History.prototype.pushState;
  nativeReplaceState = History.prototype.replaceState;

  History.prototype.pushState = function patchedPushState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const result = nativePushState!.call(this, data, unused, url);
    if (this === window.history) notifyIfChanged();
    return result;
  };

  History.prototype.replaceState = function patchedReplaceState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const result = nativeReplaceState!.call(this, data, unused, url);
    if (this === window.history) notifyIfChanged();
    return result;
  };
}

function isModifiedClick(event: MouseEvent): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function resolveClickedHashLink(
  event: MouseEvent,
): HTMLAnchorElement | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  return anchor;
}

export function isSameDocumentHashNavigation(
  anchor: Pick<HTMLAnchorElement, "href">,
  location: Pick<Location, "href" | "origin" | "pathname" | "search" | "hash">,
): boolean {
  let url: URL;
  try {
    url = new URL(anchor.href, location.href);
  } catch {
    return false;
  }
  if (url.origin !== location.origin) return false;
  if (url.pathname !== location.pathname) return false;
  if (url.search !== location.search) return false;
  return url.hash !== location.hash || Boolean(parseSectionHash(url.hash));
}

function onDocumentClickCapture(event: MouseEvent) {
  if (event.defaultPrevented) return;
  if (isModifiedClick(event)) return;

  const anchor = resolveClickedHashLink(event);
  if (!anchor) return;
  if (!isSameDocumentHashNavigation(anchor, window.location)) return;

  const url = new URL(anchor.href, window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (next !== current) {
    window.history.pushState(null, "", next);
  } else {
    notifyIfChanged();
    emit();
  }

  if (!url.hash) {
    window.scrollTo({ top: 0 });
  }
}

/**
 * Install once per browsing context. Safe to call from multiple mounts.
 */
export function installSectionHashNavigation(): void {
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;
  lastHref = currentHref();
  patchHistory();
  window.addEventListener("popstate", notifyIfChanged);
  window.addEventListener("hashchange", notifyIfChanged);
  document.addEventListener("click", onDocumentClickCapture, true);
}

export function subscribeSectionHash(listener: Listener): () => void {
  installSectionHashNavigation();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSectionHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash;
}

export function getServerSectionHash(): string {
  return "";
}

/**
 * Same-document hash navigation without a Next.js RSC round-trip.
 * Cross-route destinations must still use the router / <Link>.
 */
export function navigateToSection(
  href: string,
  options?: { replace?: boolean },
): void {
  if (typeof window === "undefined") return;
  installSectionHashNavigation();

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (
    url.pathname !== window.location.pathname ||
    url.search !== window.location.search
  ) {
    return;
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) {
    if (!url.hash) window.scrollTo({ top: 0 });
    return;
  }

  if (options?.replace) {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }

  if (!url.hash) {
    window.scrollTo({ top: 0 });
  }
}

/** Test-only: restore natives and drop listeners. */
export function resetSectionHashNavigationForTests(): void {
  if (typeof window === "undefined") return;
  document.removeEventListener("click", onDocumentClickCapture, true);
  window.removeEventListener("popstate", notifyIfChanged);
  window.removeEventListener("hashchange", notifyIfChanged);
  if (nativePushState) {
    History.prototype.pushState = nativePushState;
    nativePushState = null;
  }
  if (nativeReplaceState) {
    History.prototype.replaceState = nativeReplaceState;
    nativeReplaceState = null;
  }
  listeners.clear();
  installed = false;
  lastHref = "";
}
