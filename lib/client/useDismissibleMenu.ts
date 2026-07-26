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
};

/**
 * Shared open/close behaviour for the profile (and similar) menus.
 * Registers document listeners only while open; cleans them up on close/unmount.
 */
export function useDismissibleMenu(options: UseDismissibleMenuOptions = {}) {
  const { closeOnChangeKey = null } = options;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return {
    open,
    setOpen,
    toggle,
    close,
    closeAndFocusTrigger,
    containerRef: containerRef as RefObject<HTMLDivElement | null>,
    triggerRef: triggerRef as RefObject<HTMLButtonElement | null>,
    menuId,
  };
}
