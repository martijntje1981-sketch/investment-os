/**
 * Restore wiped Example entitlement + mobile UserMenu portal contracts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  detectExampleTemplateFromHoldings,
  parseExampleRestoreAllowlist,
  isEmailOnExampleRestoreAllowlist,
  restoreWipedExampleEntitlement,
} from "@/lib/services/examplePortfolio/restoreWipedExampleEntitlement";
import {
  resolveExampleStatus,
  shouldShowExampleBanner,
} from "@/lib/services/examplePortfolio/resolveExampleStatus";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("restore wiped example entitlement", () => {
  it("detects global and income template books from symbols", () => {
    expect(
      detectExampleTemplateFromHoldings([
        { symbol: "VWCE", assetType: "investment" },
        { symbol: "CSPX", assetType: "investment" },
        { symbol: "AIFS", assetType: "investment" },
        { symbol: "PPFB", assetType: "investment" },
        { symbol: "EUR", assetType: "cash" },
      ]),
    ).toBe("global");
    expect(
      detectExampleTemplateFromHoldings([
        { symbol: "VHYL", assetType: "investment" },
        { symbol: "VWCE", assetType: "investment" },
        { symbol: "STRC", assetType: "investment" },
      ]),
    ).toBe("income");
    expect(
      detectExampleTemplateFromHoldings([
        { symbol: "AAPL", assetType: "investment" },
      ]),
    ).toBeNull();
  });

  it("only allowlists configured emails", () => {
    expect(
      parseExampleRestoreAllowlist(" Ada@Example.COM , bob@x.io "),
    ).toEqual(new Set(["ada@example.com", "bob@x.io"]));
    expect(
      isEmailOnExampleRestoreAllowlist("ada@example.com", "ada@example.com"),
    ).toBe(true);
    expect(
      isEmailOnExampleRestoreAllowlist("other@example.com", "ada@example.com"),
    ).toBe(false);
    expect(isEmailOnExampleRestoreAllowlist("ada@example.com", "")).toBe(false);
  });

  function mockAdmin(opts: {
    existing?: Record<string, unknown> | null;
    upserted?: Record<string, unknown>;
    calls?: string[];
  }) {
    const calls = opts.calls ?? [];
    return {
      calls,
      admin: {
        from() {
          return {
            upsert() {
              calls.push("upsert");
              return {
                select() {
                  return {
                    maybeSingle: async () => ({
                      data: opts.upserted ?? null,
                      error: null,
                    }),
                  };
                },
              };
            },
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: opts.existing ?? null,
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
        auth: {
          admin: {
            getUserById: async () => ({
              data: { user: { user_metadata: {} } },
              error: null,
            }),
            updateUserById: async () => {
              calls.push("metadata");
              return { data: {}, error: null };
            },
          },
        },
      },
    };
  }

  const globalHoldings = [
    { symbol: "VWCE", assetType: "investment" as const },
    { symbol: "CSPX", assetType: "investment" as const },
    { symbol: "AIFS", assetType: "investment" as const },
    { symbol: "PPFB", assetType: "investment" as const },
  ];

  it("restores one active entitlement for an allowlisted wiped account", async () => {
    const upserted = {
      email_normalized: "ada@example.com",
      user_id: "user-1",
      template: "global",
      started_at: "2026-08-04T10:00:00.000Z",
      expires_at: "2026-08-11T10:00:00.000Z",
      seeded_at: "2026-08-04T10:00:00.000Z",
      converted_at: null,
    };
    const { admin, calls } = mockAdmin({ existing: null, upserted });

    const result = await restoreWipedExampleEntitlement({
      admin: admin as never,
      user: {
        id: "user-1",
        email: "ada@example.com",
      } as never,
      holdings: globalHoldings,
      allowlistRaw: "ada@example.com",
      now: new Date("2026-08-04T10:00:00.000Z"),
    });

    expect(result.restored).toBe(true);
    expect(result.entitlement?.seeded_at).toBeTruthy();
    expect(result.entitlement?.converted_at).toBeNull();
    expect(calls).toContain("upsert");
    expect(calls).toContain("metadata");
    // Restore never reseeds holdings — only entitlement + metadata.
    expect(calls.filter((c) => c === "upsert")).toHaveLength(1);

    const status = resolveExampleStatus({
      entitlement: result.entitlement,
      now: new Date("2026-08-04T12:00:00.000Z"),
    });
    expect(status.kind).toBe("active");
    expect(status.bannerLabel).toBeTruthy();
    expect(status.daysRemaining).toBeGreaterThan(0);
    expect(shouldShowExampleBanner(status)).toBe(true);

    const blocked = await restoreWipedExampleEntitlement({
      admin: admin as never,
      user: { id: "user-2", email: "other@example.com" } as never,
      holdings: globalHoldings,
      allowlistRaw: "ada@example.com",
    });
    expect(blocked.restored).toBe(false);
    expect(blocked.reason).toBe("not_allowlisted");
  });

  it("does not touch converted or already-active entitlements", async () => {
    const converted = mockAdmin({
      existing: {
        email_normalized: "ada@example.com",
        user_id: "user-1",
        template: "global",
        started_at: "2026-07-01T00:00:00.000Z",
        expires_at: "2026-07-08T00:00:00.000Z",
        seeded_at: "2026-07-01T00:00:00.000Z",
        converted_at: "2026-07-05T00:00:00.000Z",
      },
    });
    const convertedResult = await restoreWipedExampleEntitlement({
      admin: converted.admin as never,
      user: { id: "user-1", email: "ada@example.com" } as never,
      holdings: globalHoldings,
      allowlistRaw: "ada@example.com",
    });
    expect(convertedResult.restored).toBe(false);
    expect(convertedResult.reason).toBe("converted");
    expect(converted.calls).not.toContain("upsert");

    const active = mockAdmin({
      existing: {
        email_normalized: "ada@example.com",
        user_id: "user-1",
        template: "global",
        started_at: "2026-08-01T00:00:00.000Z",
        expires_at: "2026-08-08T00:00:00.000Z",
        seeded_at: "2026-08-01T00:00:00.000Z",
        converted_at: null,
      },
    });
    const activeResult = await restoreWipedExampleEntitlement({
      admin: active.admin as never,
      user: { id: "user-1", email: "ada@example.com" } as never,
      holdings: globalHoldings,
      allowlistRaw: "ada@example.com",
    });
    expect(activeResult.restored).toBe(false);
    expect(activeResult.reason).toBe("already_active");
    expect(active.calls).not.toContain("upsert");
  });

  it("wires restore into the status route", () => {
    const route = read("app/api/example-portfolio/status/route.ts");
    expect(route).toContain("restoreWipedExampleEntitlement");
    expect(route).toContain("restored_wiped_entitlement");
  });
});

describe("mobile UserMenu portal", () => {
  it("portals the production UserMenu panel above header stacking contexts", () => {
    const menu = read("components/auth/UserMenu.tsx");
    const dismissible = read("lib/client/useDismissibleMenu.ts");
    const layout = read("app/layout.tsx");

    expect(layout).toContain("<UserMenu />");
    expect(menu).toContain("createPortal");
    expect(menu).toContain("document.body");
    expect(menu).toContain("panelRef");
    expect(menu).toContain("profile-menu-footer");
    expect(menu).toContain("Log out");
    expect(menu).toContain("z-[80]");
    expect(menu).not.toContain("sm:absolute");
    expect(dismissible).toContain("panelRef");
    expect(dismissible).toContain("window.setTimeout");
    expect(dismissible).toContain("panelRef.current?.contains(target)");
  });
});
