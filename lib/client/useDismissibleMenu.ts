"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

type UseDismissibleMenuOptions = {
  /** Close when the route/pathname changes. */
  closeOnChangeKey?: string | null;
  /**
   * Lock document scroll while open. Keep true for large overlay menus;
   * small dropdowns should pass false.
   */
  lockScroll?: boolean;
};

/**
 * Shared open/close behaviour for the profile (and similar) menus.
 * Registers document listeners only while open; cleans them up on close/unmount.
 *
 * `panelRef` is optional for portaled panels that live outside `containerRef`.
 */
export function useDismissibleMenu(options: UseDismissibleMenuOptions = {}) {
  const { closeOnChangeKey = null, lockScroll = true } = options;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const closeAndFocusTrigger = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [closeOnChangeKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }
      if (panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    // Defer outside-close so the opening tap/pointer cannot immediately dismiss.
    let removePointer: (() => void) | null = null;
    const deferId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
      removePointer = () => {
        document.removeEventListener("pointerdown", handlePointerDown);
      };
    }, 0);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(deferId);
      removePointer?.();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  /**
   * Lock page scroll while the menu is open so the menu panel scrolls
   * independently (including iOS) instead of the page behind it.
   */
  useEffect(() => {
    if (!open || !lockScroll || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
      htmlOverscroll: documentElement.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      documentElement.style.overflow = previous.htmlOverflow;
      documentElement.style.overscrollBehavior = previous.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [lockScroll, open]);

  return {
    open,
    setOpen,
    toggle,
    close,
    closeAndFocusTrigger,
    containerRef: containerRef as RefObject<HTMLDivElement | null>,
    panelRef: panelRef as RefObject<HTMLDivElement | null>,
    triggerRef: triggerRef as RefObject<HTMLButtonElement | null>,
    menuId,
  };
}
