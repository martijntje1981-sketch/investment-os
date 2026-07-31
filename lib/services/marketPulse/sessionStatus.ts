/**
 * Session-status labels from fixed regional schedules (Europe/Amsterdam clock).
 * Not a live exchange feed — schedule-based only.
 */

export type MarketSessionRow = {
  id: string;
  label: string;
  state: "open" | "closed" | "opens_soon";
  detail: string;
};

function amsterdamParts(now: Date): {
  weekday: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekdayText = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  return {
    weekday: weekdayMap[weekdayText] ?? now.getUTCDay(),
    minutes: hour * 60 + minute,
  };
}

function opensInLabel(minutesUntil: number): string {
  if (minutesUntil <= 0) return "Opening soon";
  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  if (hours <= 0) return `Opens in ${mins}m`;
  if (mins === 0) return `Opens in ${hours}h`;
  return `Opens in ${hours}h ${mins}m`;
}

/**
 * Crypto is 24/7. Equity regions use standard cash-session windows in Amsterdam time.
 * Weekends: equity regions closed.
 */
export function buildMarketSessionStatus(now = new Date()): MarketSessionRow[] {
  const { weekday, minutes } = amsterdamParts(now);
  const weekdaySession = weekday >= 1 && weekday <= 5;

  const europeOpen = weekdaySession && minutes >= 9 * 60 && minutes < 17 * 60 + 30;
  const usOpen = weekdaySession && minutes >= 15 * 60 + 30 && minutes < 22 * 60;
  // Tokyo cash session ≈ 01:00–07:00 Amsterdam (approx JST 09:00–15:00).
  const asiaOpen = weekdaySession && minutes >= 60 && minutes < 7 * 60;

  const rows: MarketSessionRow[] = [
    {
      id: "crypto",
      label: "Crypto",
      state: "open",
      detail: "Open",
    },
  ];

  if (!weekdaySession) {
    rows.push(
      { id: "europe", label: "Europe", state: "closed", detail: "Closed" },
      { id: "us", label: "US", state: "closed", detail: "Closed" },
      { id: "asia", label: "Asia", state: "closed", detail: "Closed" },
    );
    return rows;
  }

  rows.push({
    id: "europe",
    label: "Europe",
    state: europeOpen ? "open" : "closed",
    detail: europeOpen ? "Open" : "Closed",
  });

  if (usOpen) {
    rows.push({ id: "us", label: "US", state: "open", detail: "Open" });
  } else if (minutes < 15 * 60 + 30) {
    const until = 15 * 60 + 30 - minutes;
    rows.push({
      id: "us",
      label: "US",
      state: until <= 180 ? "opens_soon" : "closed",
      detail: until <= 180 ? opensInLabel(until) : "Closed",
    });
  } else {
    rows.push({ id: "us", label: "US", state: "closed", detail: "Closed" });
  }

  if (asiaOpen) {
    rows.push({ id: "asia", label: "Asia", state: "open", detail: "Open" });
  } else if (minutes < 60) {
    rows.push({
      id: "asia",
      label: "Asia",
      state: "opens_soon",
      detail: opensInLabel(60 - minutes),
    });
  } else {
    rows.push({ id: "asia", label: "Asia", state: "closed", detail: "Closed" });
  }

  return rows;
}
