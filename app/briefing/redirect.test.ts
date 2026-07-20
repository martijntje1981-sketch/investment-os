import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  LEGACY_BRIEFING_PATH,
  NEWS_HUB_PATH,
  resolveLegacyBriefingRedirect,
} from "@/lib/navigation/newsHubRoutes";

describe("legacy briefing redirect", () => {
  it("targets /news exactly once", () => {
    expect(resolveLegacyBriefingRedirect()).toBe(NEWS_HUB_PATH);
  });

  it("uses a server redirect page without client-side loops", () => {
    const briefingPage = readFileSync(
      path.resolve(process.cwd(), "app/briefing/page.tsx"),
      "utf8",
    );
    const newsPage = readFileSync(
      path.resolve(process.cwd(), "app/news/page.tsx"),
      "utf8",
    );
    const middleware = readFileSync(
      path.resolve(process.cwd(), "lib/supabase/middleware.ts"),
      "utf8",
    );

    expect(briefingPage).toContain("redirect(");
    expect(briefingPage).not.toContain('"use client"');
    expect(newsPage).not.toContain(`redirect("${LEGACY_BRIEFING_PATH}")`);
    expect(newsPage).not.toContain(`redirect('${LEGACY_BRIEFING_PATH}')`);
    expect(middleware).toContain('"/briefing"');
    expect(middleware).toContain('"/news"');
  });
});
