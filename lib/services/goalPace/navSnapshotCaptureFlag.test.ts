import { afterEach, describe, expect, it, vi } from "vitest";

import { isPortfolioNavSnapshotCaptureEnabled } from "@/lib/services/goalPace/navSnapshotCaptureFlag";

describe("isPortfolioNavSnapshotCaptureEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled when absent", () => {
    expect(isPortfolioNavSnapshotCaptureEnabled({})).toBe(false);
  });

  it("is disabled for any value except exact true", () => {
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "false",
      }),
    ).toBe(false);
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "TRUE",
      }),
    ).toBe(false);
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "1",
      }),
    ).toBe(false);
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "true ",
      }),
    ).toBe(false);
  });

  it("is enabled only for exact true", () => {
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("keeps Preview and default environments write-disabled without the flag", () => {
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isPortfolioNavSnapshotCaptureEnabled({
        VERCEL_ENV: "preview",
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "false",
      }),
    ).toBe(false);
  });
});
