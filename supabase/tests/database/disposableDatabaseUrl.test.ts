import { describe, expect, it } from "vitest";

import {
  assertDisposableDatabaseUrl,
  describeDisposableDatabaseTarget,
} from "./disposableDatabaseUrl.mjs";

describe("assertDisposableDatabaseUrl", () => {
  it("allows a CI service URL on localhost", () => {
    expect(
      assertDisposableDatabaseUrl("postgres://postgres:postgres@localhost:5432/postgres", {
        GITHUB_ACTIONS: "true",
      }),
    ).toMatchObject({ hostname: "localhost", database: "postgres" });
  });

  it("rejects a missing URL in CI", () => {
    expect(() =>
      assertDisposableDatabaseUrl("", { GITHUB_ACTIONS: "true" }),
    ).toThrow(/requires DATABASE_URL/);
  });

  it("never accepts a Supabase or hosted URL", () => {
    expect(() =>
      assertDisposableDatabaseUrl(
        "postgres://postgres:secret@db.xyz.supabase.co:5432/postgres",
        {},
      ),
    ).toThrow(/not a disposable/);
    expect(() =>
      assertDisposableDatabaseUrl(
        "postgres://postgres:secret@db.xyz.supabase.co:5432/postgres",
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://db.xyz.supabase.co",
        },
      ),
    ).toThrow(/not a disposable|must not be the configured Supabase URL/);
  });

  it("does not describe passwords", () => {
    const target = describeDisposableDatabaseTarget(
      "postgres://owner:super-secret@127.0.0.1:5432/postgres",
    );
    expect(JSON.stringify(target)).not.toContain("super-secret");
    expect(target.hostname).toBe("127.0.0.1");
  });
});
