import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isBottomNavItemActive } from "@/components/home/bottomNavActive";

describe("bottom navigation active state", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
    "utf8",
  );

  it("highlights only the matching main route", () => {
    expect(isBottomNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isBottomNavItemActive("/news", "/dashboard")).toBe(false);
    expect(isBottomNavItemActive("/news", "/news")).toBe(true);
    expect(isBottomNavItemActive("/portfolio", "/news")).toBe(false);
    expect(isBottomNavItemActive("/portfolio/vwce", "/portfolio")).toBe(true);
    expect(isBottomNavItemActive("/analysis", "/analysis")).toBe(true);
    expect(isBottomNavItemActive("/goals", "/goals")).toBe(true);
    expect(isBottomNavItemActive("/goals", "/news")).toBe(false);
  });

  it("does not give News featured/selected styling when inactive", () => {
    expect(source).not.toContain("featured: true");
    expect(source).not.toContain("ring-violet");
    expect(source).not.toContain("bg-violet-600");
    expect(source).not.toContain("appBottomNavFeaturedLabelClass");
    expect(source).toContain('aria-current={active ? "page" : undefined}');
    expect(source).toContain("bg-slate-950 text-white shadow-lg");
    expect(source).toContain(
      "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    );
  });
});
