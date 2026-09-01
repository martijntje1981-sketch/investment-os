import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, runTrustedNavSnapshotCapture } = vi.hoisted(() => ({
  getUser: vi.fn(),
  runTrustedNavSnapshotCapture: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/services/goalPace/trustedNavSnapshotCapture", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/goalPace/trustedNavSnapshotCapture")
  >();
  return {
    ...actual,
    runTrustedNavSnapshotCapture,
  };
});

import { POST } from "@/app/api/portfolio/nav-snapshot/route";

const USER_A = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  user_metadata: {},
};
const PORT_A = "11111111-1111-4111-8111-111111111111";

describe("POST /api/portfolio/nav-snapshot", () => {
  beforeEach(() => {
    getUser.mockReset();
    runTrustedNavSnapshotCapture.mockReset();
    runTrustedNavSnapshotCapture.mockResolvedValue({
      httpStatus: 200,
      body: { status: "disabled" },
    });
  });

  it("rejects unauthenticated requests before any write", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(
      new Request("http://localhost/api/portfolio/nav-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: PORT_A }),
      }),
    );
    expect(response.status).toBe(401);
    expect(runTrustedNavSnapshotCapture).not.toHaveBeenCalled();
  });

  it("passes the session user and only the requested portfolioId", async () => {
    getUser.mockResolvedValue({ data: { user: USER_A } });
    const response = await POST(
      new Request("http://localhost/api/portfolio/nav-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: PORT_A,
          userId: "forged",
          navEur: 12,
          isDemo: true,
          goalId: "g1",
          authority: "trusted_server",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(runTrustedNavSnapshotCapture).toHaveBeenCalledWith({
      user: USER_A,
      requestedPortfolioId: PORT_A,
    });
    const payload = await response.json();
    expect(payload).toEqual({ status: "disabled" });
  });

  it("returns forbidden from the trusted path", async () => {
    getUser.mockResolvedValue({ data: { user: USER_A } });
    runTrustedNavSnapshotCapture.mockResolvedValue({
      httpStatus: 403,
      body: { status: "forbidden" },
    });
    const response = await POST(
      new Request("http://localhost/api/portfolio/nav-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: "other-portfolio" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: "forbidden" });
  });
});
