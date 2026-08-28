import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseSectionHash } from "@/lib/navigation/deepLinks";
import { ANALYSIS_PATH, NEWS_PATH } from "@/lib/navigation/appRoutes";
import { ANALYSIS_EXPLORE_DESTINATIONS, resolveAnalysisDetailId } from "@/lib/services/analysisGlance";
import {
  NEWS_EXPLORE_DESTINATIONS,
  resolveNewsDetailId,
} from "@/lib/services/newsGlance";
import {
  getSectionHash,
  installSectionHashNavigation,
  isSameDocumentHashNavigation,
  navigateToSection,
  resetSectionHashNavigationForTests,
  subscribeSectionHash,
} from "@/lib/client/sectionHashNavigation";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function setPath(pathName: string) {
  window.history.replaceState(null, "", pathName);
}

describe("shared section hash navigation", () => {
  beforeEach(() => {
    window.scrollTo = () => undefined;
    resetSectionHashNavigationForTests();
    setPath(NEWS_PATH);
    installSectionHashNavigation();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetSectionHashNavigationForTests();
  });

  it("A/B/C. pushState hash changes notify immediately without hashchange or reload", () => {
    const seen: string[] = [];
    const unsubscribe = subscribeSectionHash(() => {
      seen.push(getSectionHash());
    });

    window.history.pushState(null, "", `${NEWS_PATH}#portfolio-news`);
    expect(window.location.hash).toBe("#portfolio-news");
    expect(seen).toEqual(["#portfolio-news"]);
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-news",
    );

    setPath(ANALYSIS_PATH);
    window.history.pushState(null, "", `${ANALYSIS_PATH}#portfolio-allocation`);
    expect(resolveAnalysisDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-allocation",
    );
    expect(seen.at(-1)).toBe("#portfolio-allocation");
    unsubscribe();
  });

  it("D. direct initial hash is readable without a click", () => {
    setPath(`${NEWS_PATH}#markets-today`);
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "markets-today",
    );
    setPath(`${ANALYSIS_PATH}#portfolio-allocation`);
    expect(resolveAnalysisDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-allocation",
    );
  });

  it("E. detail A → detail B notifies with the new hash", () => {
    const seen: string[] = [];
    subscribeSectionHash(() => seen.push(getSectionHash()));
    window.history.pushState(null, "", `${NEWS_PATH}#portfolio-news`);
    window.history.pushState(null, "", `${NEWS_PATH}#markets-today`);
    expect(seen).toEqual(["#portfolio-news", "#markets-today"]);
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "markets-today",
    );
  });

  it("F. Back to glance clears the detail hash", () => {
    window.history.pushState(null, "", `${NEWS_PATH}#portfolio-news`);
    navigateToSection(NEWS_PATH);
    expect(window.location.hash).toBe("");
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBeNull();
  });

  it("G/H. browser Back and Forward events resynchronize the hash", () => {
    const seen: string[] = [];
    subscribeSectionHash(() => seen.push(getSectionHash() || "(glance)"));
    window.history.pushState(null, "", `${NEWS_PATH}#portfolio-news`);
    window.history.pushState(null, "", `${NEWS_PATH}#markets-today`);
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "markets-today",
    );

    window.history.replaceState(null, "", `${NEWS_PATH}#portfolio-news`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-news",
    );

    window.history.replaceState(null, "", `${NEWS_PATH}#markets-today`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "markets-today",
    );
    expect(seen).toContain("#portfolio-news");
    expect(seen).toContain("#markets-today");
  });

  it("I. repeated install does not duplicate history notifications", () => {
    installSectionHashNavigation();
    installSectionHashNavigation();
    let calls = 0;
    subscribeSectionHash(() => {
      calls += 1;
    });
    window.history.pushState(null, "", `${NEWS_PATH}#news-search`);
    expect(calls).toBe(1);
  });

  it("same-document Explore clicks update the hash and cancel the default", () => {
    setPath(NEWS_PATH);
    const link = document.createElement("a");
    link.href = `${NEWS_PATH}#portfolio-news`;
    link.textContent = "View all holding news";
    document.body.appendChild(link);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const allowed = link.dispatchEvent(event);
    expect(allowed).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe("#portfolio-news");
    expect(resolveNewsDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-news",
    );

    setPath(ANALYSIS_PATH);
    const allocation = document.createElement("a");
    allocation.href = `${ANALYSIS_PATH}#portfolio-allocation`;
    allocation.textContent = "Explore allocation";
    document.body.appendChild(allocation);
    const analysisEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    allocation.dispatchEvent(analysisEvent);
    expect(analysisEvent.defaultPrevented).toBe(true);
    expect(resolveAnalysisDetailId(parseSectionHash(getSectionHash()))).toBe(
      "portfolio-allocation",
    );
  });

  it("does not intercept cross-route links", () => {
    expect(
      isSameDocumentHashNavigation(
        { href: `${ANALYSIS_PATH}#portfolio-allocation` },
        {
          href: `https://www.tobailey.com${NEWS_PATH}`,
          origin: "https://www.tobailey.com",
          pathname: NEWS_PATH,
          search: "",
          hash: "",
        },
      ),
    ).toBe(false);
    expect(
      isSameDocumentHashNavigation(
        { href: `${NEWS_PATH}#portfolio-news` },
        {
          href: `https://www.tobailey.com${NEWS_PATH}`,
          origin: "https://www.tobailey.com",
          pathname: NEWS_PATH,
          search: "",
          hash: "",
        },
      ),
    ).toBe(true);
  });

  it("J. hash navigation helpers never write the portfolio", () => {
    const store = read("lib/client/sectionHashNavigation.ts");
    const newsHook = read("lib/client/useNewsDetailId.ts");
    const analysisHook = read("lib/client/useAnalysisDetailId.ts");
    for (const source of [store, newsHook, analysisHook]) {
      expect(source).not.toContain("saveHoldings");
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("sync_version");
    }
  });

  it("K/L. existing Analysis and News deep links remain valid", () => {
    expect(ANALYSIS_EXPLORE_DESTINATIONS.allocation).toBe(
      `${ANALYSIS_PATH}#portfolio-allocation`,
    );
    expect(NEWS_EXPLORE_DESTINATIONS.holdings).toBe(`${NEWS_PATH}#portfolio-news`);
    expect(NEWS_EXPLORE_DESTINATIONS.marketsToday).toContain("#markets-today");
    expect(resolveAnalysisDetailId("portfolio-allocation")).toBe(
      "portfolio-allocation",
    );
    expect(resolveNewsDetailId("portfolio-news")).toBe("portfolio-news");
    expect(resolveNewsDetailId("markets-today")).toBe("markets-today");
    expect(resolveNewsDetailId("news-macro")).toBe("news-macro");
  });

  it("M. shared consumers subscribe to the same store, not hashchange alone", () => {
    expect(read("lib/client/useNewsDetailId.ts")).toContain("subscribeSectionHash");
    expect(read("lib/client/useAnalysisDetailId.ts")).toContain(
      "subscribeSectionHash",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "subscribeSectionHash",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "installSectionHashNavigation",
    );
    expect(read("components/providers/AppProviders.tsx")).toContain(
      "SectionDeepLinkEffect",
    );
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      "useAnalysisDetailId",
    );
    expect(read("app/news/page.tsx")).toContain("useNewsDetailId");
  });
});
