import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/market-snapshot/route";
import { runScheduledMarketSnapshot } from "@/lib/services/marketSnapshot/marketSnapshotService";

vi.mock("@/lib/services/marketSnapshot/marketSnapshotService", () => ({
  runScheduledMarketSnapshot: vi.fn(),
}));

describe("GET /api/cron/market-snapshot", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("rejects unauthorized requests", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/market-snapshot"),
    );

    expect(response.status).toBe(401);
  });

  it("runs the scheduled snapshot for authorized cron calls", async () => {
    vi.mocked(runScheduledMarketSnapshot).mockResolvedValue({
      ok: true,
      skipped: false,
      slot: "eu_open",
      symbolsRequested: 3,
      symbolsReceived: 3,
      providerCalls: 4,
    });

    const response = await GET(
      new Request("http://localhost/api/cron/market-snapshot?window=eu", {
        headers: {
          authorization: "Bearer test-cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(runScheduledMarketSnapshot).toHaveBeenCalledWith({ windowHint: "eu" });
  });
});
