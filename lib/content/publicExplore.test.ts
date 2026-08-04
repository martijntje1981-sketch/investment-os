import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  PUBLIC_EXPLORE_DESTINATIONS,
  PUBLIC_EXPLORE_PATH,
} from "@/lib/content/publicExplore";
import { isAuthRequiredPath, isPublicAppPath } from "@/lib/auth/routeAccess";

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("public explore discovery", () => {
  it("keeps the explore hub and destinations publicly accessible", () => {
    expect(isPublicAppPath(PUBLIC_EXPLORE_PATH)).toBe(true);
    expect(isAuthRequiredPath(PUBLIC_EXPLORE_PATH)).toBe(false);

    for (const destination of PUBLIC_EXPLORE_DESTINATIONS) {
      expect(isPublicAppPath(destination.href)).toBe(true);
      expect(isAuthRequiredPath(destination.href)).toBe(false);
    }
  });

  it("wires landing discovery to the public explore hub", () => {
    const landing = readProjectFile("app/page.tsx");
    const header = readProjectFile("components/marketing/MarketingHeader.tsx");
    const explorePage = readProjectFile("app/explore/page.tsx");

    expect(landing).toContain('href="/explore"');
    expect(landing).toContain("Explore Tobailey");
    expect(landing).not.toContain("Explore the dashboard");
    expect(header).toContain("Explore");
    expect(header).toContain("PUBLIC_EXPLORE_PATH");
    expect(header).toContain("PUBLIC_EXPLORE_DESTINATIONS");
    expect(explorePage).toContain("PUBLIC_EXPLORE_DESTINATIONS");
    expect(explorePage).toContain("Browse without signing in");
    expect(explorePage).toContain("Demo Portfolio");
    expect(explorePage).toContain("Create your own portfolio");
  });

  it("keeps guest bottom navigation on public app routes only", () => {
    const bottomNav = readProjectFile("components/home/BottomNav.tsx");

    expect(bottomNav).toContain("guestItems");
    expect(bottomNav).toContain('label: "Perspectives"');
    expect(bottomNav).toContain('label: "Markets"');
    expect(bottomNav).toContain('label: "Instruments"');
    expect(bottomNav).toContain('label: "Sign in"');
    expect(bottomNav).toContain("isPublicAppPath(pathname)");
    expect(bottomNav).toContain("isMarketingPath(pathname)");
  });
});
