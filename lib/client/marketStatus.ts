export type MarketStatusEntry = {
  label: string;
  status: "open" | "closed" | "always-open";
  statusLabel: string;
};

function getTimeParts(
  date: Date,
  timeZone: string,
): {
  weekday: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}

function isMarketOpen({
  date,
  timeZone,
  openHour,
  openMinute,
  closeHour,
  closeMinute,
}: {
  date: Date;
  timeZone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
}): boolean {
  const { weekday, hour, minute } = getTimeParts(date, timeZone);
  if (["Sat", "Sun"].includes(weekday)) return false;

  const currentMinutes = hour * 60 + minute;
  const openingMinutes = openHour * 60 + openMinute;
  const closingMinutes = closeHour * 60 + closeMinute;

  return currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
}

export function getMarketStatuses(date = new Date()): MarketStatusEntry[] {
  const europeOpen = isMarketOpen({
    date,
    timeZone: "Europe/Amsterdam",
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 30,
  });

  const usaOpen = isMarketOpen({
    date,
    timeZone: "America/New_York",
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  });

  return [
    {
      label: "Europe",
      status: europeOpen ? "open" : "closed",
      statusLabel: europeOpen ? "Open" : "Closed",
    },
    {
      label: "United States",
      status: usaOpen ? "open" : "closed",
      statusLabel: usaOpen ? "Open" : "Closed",
    },
    {
      label: "Crypto",
      status: "always-open",
      statusLabel: "Always open",
    },
  ];
}

export function formatMarketUpdateTime(value?: string | null): string {
  if (!value) return "Not available yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available yet";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
