"use client";

import { useEffect } from "react";

/**
 * Stops the browser from navigating to / opening a dropped file
 * (images and PDFs otherwise open a new tab).
 */
export function preventBrowserFileNavigation(event: {
  preventDefault: () => void;
}): void {
  event.preventDefault();
}

export function usePreventBrowserFileNavigation(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    function onDragOver(event: DragEvent) {
      event.preventDefault();
    }

    function onDrop(event: DragEvent) {
      event.preventDefault();
    }

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [active]);
}
