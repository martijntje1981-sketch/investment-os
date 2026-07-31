import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isBottomNavItemActive } from "@/components/home/bottomNavActive";

describe("bottom navigation active state", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
    "utf8",
  );

  it("keeps only primary workflow destinations", () => {
    expect(source).toContain('href: "/dashboard"');
    expect(source).toContain('href: "/portfolio"');
    expect(source).toContain('href: "/analysis"');
    expect(source).toContain('href: "/goals"');
    expect(source).not.toContain('href: "/news"');
    expect(source).not.toContain('href: "/market-pulse"');
    expect(source).not.toContain('href: "/portfolio-health"');
    expect(source).toContain("grid-cols-4");
  });

  it("highlights only the matching main route", () => {
    expect(isBottomNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isBottomNavItemActive("/news", "/dashboard")).toBe(false);
    expect(isBottomNavItemActive("/portfolio", "/portfolio")).toBe(true);
    expect(isBottomNavItemActive("/portfolio/vwce", "/portfolio")).toBe(true);
    expect(isBottomNavItemActive("/analysis", "/analysis")).toBe(true);
    expect(isBottomNavItemActive("/goals", "/goals")).toBe(true);
  });

  it("uses shared active styling tokens", () => {
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("bg-slate-950 text-white shadow-lg");
    expect(source).toContain(
      "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    );
  });
});
