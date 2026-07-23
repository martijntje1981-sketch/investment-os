import { describe, expect, it } from "vitest";

import {
  getAmsterdamClock,
  resolveSnapshotSlotForCron,
  resolveSnapshotSlotFromClock,
} from "@/lib/services/marketSnapshot/amsterdamSchedule";

describe("amsterdamSchedule", () => {
  it("detects the EU open slot around 09:30 Amsterdam", () => {
    const clock = { date: "2026-07-23", hour: 9, minute: 30 };
    expect(resolveSnapshotSlotFromClock(clock)).toBe("eu_open");
  });

  it("detects the US open slot around 15:35 Amsterdam", () => {
    const clock = { date: "2026-07-23", hour: 15, minute: 35 };
    expect(resolveSnapshotSlotFromClock(clock)).toBe("us_open");
  });

  it("returns null outside refresh windows", () => {
    const clock = { date: "2026-07-23", hour: 12, minute: 0 };
    expect(resolveSnapshotSlotFromClock(clock)).toBeNull();
  });

  it("matches cron window hints only inside the Amsterdam slot", () => {
    const now = new Date("2026-07-23T07:30:00.000Z");
    expect(resolveSnapshotSlotForCron(now, "eu")).toBe("eu_open");
    expect(resolveSnapshotSlotForCron(now, "us")).toBeNull();
  });

  it("formats Amsterdam calendar dates", () => {
    const clock = getAmsterdamClock(new Date("2026-07-23T07:30:00.000Z"));
    expect(clock.date).toMatch(/2026-07-23/);
  });
});
