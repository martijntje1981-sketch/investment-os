import { createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDismissibleMenu } from "@/lib/client/useDismissibleMenu";

function MenuHarness({
  closeOnChangeKey = "/dashboard",
  onState,
}: {
  closeOnChangeKey?: string;
  onState?: (state: { open: boolean }) => void;
}) {
  const menu = useDismissibleMenu({ closeOnChangeKey });

  useEffect(() => {
    onState?.({ open: menu.open });
  }, [menu.open, onState]);

  return createElement(
    "div",
    { ref: menu.containerRef, "data-testid": "menu-root" },
    createElement(
      "button",
      {
        ref: menu.triggerRef,
        type: "button",
        "aria-expanded": menu.open,
        "aria-controls": menu.menuId,
        "aria-label": "Profile menu",
        onClick: menu.toggle,
        "data-testid": "menu-trigger",
      },
      "Profile",
    ),
    menu.open
      ? createElement(
          "div",
          {
            id: menu.menuId,
            role: "menu",
            "data-testid": "menu-panel",
          },
          createElement(
            "a",
            {
              href: "/settings",
              role: "menuitem",
              onClick: menu.close,
              "data-testid": "menu-settings",
            },
            "Settings",
          ),
          createElement(
            "a",
            {
              href: "/news",
              role: "menuitem",
              onClick: menu.close,
              "data-testid": "menu-news",
            },
            "News",
          ),
          createElement(
            "button",
            {
              type: "button",
              role: "menuitem",
              onClick: menu.close,
              "data-testid": "menu-signout",
            },
            "Sign out",
          ),
        )
      : null,
  );
}

describe("useDismissibleMenu", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let outside: HTMLButtonElement;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    container?.remove();
    outside?.remove();
    vi.restoreAllMocks();
  });

  function mount(closeOnChangeKey = "/dashboard") {
    container = document.createElement("div");
    document.body.appendChild(container);
    outside = document.createElement("button");
    outside.type = "button";
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    root = createRoot(container);

    act(() => {
      root!.render(createElement(MenuHarness, { closeOnChangeKey }));
    });
  }

  it("toggles open state from the trigger", () => {
    mount();
    const trigger = container.querySelector(
      "[data-testid='menu-trigger']",
    ) as HTMLButtonElement;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      trigger.click();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("[data-testid='menu-panel']")).toBeTruthy();

    act(() => {
      trigger.click();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("[data-testid='menu-panel']")).toBeNull();
  });

  it("closes on outside pointerdown without closing on inside interaction", () => {
    mount();
    const trigger = container.querySelector(
      "[data-testid='menu-trigger']",
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeTruthy();

    const settings = container.querySelector(
      "[data-testid='menu-settings']",
    ) as HTMLAnchorElement;
    act(() => {
      settings.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeTruthy();

    act(() => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeNull();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    mount();
    const trigger = container.querySelector(
      "[data-testid='menu-trigger']",
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeTruthy();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(container.querySelector("[data-testid='menu-panel']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when navigation key changes and keeps Settings/News/Sign out actions", () => {
    mount("/dashboard");
    const trigger = container.querySelector(
      "[data-testid='menu-trigger']",
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });
    expect(
      container.querySelector("[data-testid='menu-settings']")?.textContent,
    ).toBe("Settings");
    expect(
      container.querySelector("[data-testid='menu-news']")?.textContent,
    ).toBe("News");
    expect(
      container.querySelector("[data-testid='menu-signout']")?.textContent,
    ).toBe("Sign out");

    act(() => {
      root!.render(
        createElement(MenuHarness, { closeOnChangeKey: "/settings" }),
      );
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeNull();
  });

  it("closes from inside navigation/action clicks and cleans up listeners", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    mount();
    const trigger = container.querySelector(
      "[data-testid='menu-trigger']",
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const settings = container.querySelector(
      "[data-testid='menu-settings']",
    ) as HTMLAnchorElement;
    act(() => {
      settings.click();
    });
    expect(container.querySelector("[data-testid='menu-panel']")).toBeNull();

    act(() => {
      root?.unmount();
    });
    root = null;

    expect(
      removeSpy.mock.calls.some(
        (call) => call[0] === "pointerdown" || call[0] === "keydown",
      ),
    ).toBe(true);
  });
});

describe("UserMenu profile wiring", () => {
  it("uses the shared dismissible menu with accessible controls", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(process.cwd(), "components/auth/UserMenu.tsx"),
      "utf8",
    );

    expect(source).toContain("useDismissibleMenu");
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain("aria-controls={menuId}");
    expect(source).toContain('aria-label="Profile menu"');
    expect(source).toContain("TobaileyLogo");
    expect(source).toContain('href="/dashboard"');
    expect(source).toContain("Sign out");
    expect(source).not.toContain("<details");
  });

  it("exposes Account and Explore secondary destinations", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(process.cwd(), "components/auth/UserMenu.tsx"),
      "utf8",
    );

    expect(source).toContain('href: "/settings"');
    expect(source).toContain('label: "Profile"');
    expect(source).toContain('label: "Settings"');
    expect(source).toContain('href: "/news"');
    expect(source).toContain('href: "/discover"');
    expect(source).toContain('href: "/perspectives"');
    expect(source).toContain('label: "Perspectives"');
    expect(source).toContain('href: "/portfolio-health"');
    expect(source).toContain('href: "/market-pulse"');
    expect(source).toContain('href: "/supported-instruments"');
    expect(source).toContain('href: "/events"');
    expect(source).toContain('label: "Upcoming Events"');
    expect(source).toContain('href: "/upload"');
    expect(source).toContain('title="Portfolio"');
    expect(source).toContain('title="Intelligence"');
    expect(source).toContain('title="Account"');
    expect(source).toContain('title="Support"');
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("w-[15.5rem]");
  });
});
