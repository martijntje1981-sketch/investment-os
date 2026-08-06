/**
 * Amsterdam trading-day schedule helpers for scheduled market snapshots.
 */

export type MarketSnapshotSlot = "eu_open" | "us_open";

export type AmsterdamClock = {
  date: string;
  hour: number;
  minute: number;
};

const AMSTERDAM_TZ = "Europe/Amsterdam";

export function getAmsterdamClock(now = new Date()): AmsterdamClock {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: AMSTERDAM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const day = lookup.day ?? "01";
  const month = lookup.month ?? "01";
  const year = lookup.year ?? "1970";
  const hour = Number.parseInt(lookup.hour ?? "0", 10);
  const minute = Number.parseInt(lookup.minute ?? "0", 10);

  return {
    date: `${year}-${month}-${day}`,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function resolveSnapshotSlotFromClock(
  clock: AmsterdamClock,
): MarketSnapshotSlot | null {
  const minutes = clock.hour * 60 + clock.minute;

  const euOpenStart = 9 * 60 + 15;
  const euOpenEnd = 9 * 60 + 45;
  if (minutes >= euOpenStart && minutes <= euOpenEnd) {
    return "eu_open";
  }

  const usOpenStart = 15 * 60 + 20;
  const usOpenEnd = 15 * 60 + 50;
  if (minutes >= usOpenStart && minutes <= usOpenEnd) {
    return "us_open";
  }

  return null;
}

export function resolveSnapshotSlotForCron(
  now: Date,
  windowHint?: "eu" | "us" | null,
): MarketSnapshotSlot | null {
  const clock = getAmsterdamClock(now);
  const slot = resolveSnapshotSlotFromClock(clock);

  if (!windowHint) {
    return slot;
  }

  if (windowHint === "eu" && slot === "eu_open") {
    return "eu_open";
  }

  if (windowHint === "us" && slot === "us_open") {
    return "us_open";
  }

  return null;
}
