"use client";

type LocalUpdateTimeProps = {
  updatedAt: string;
};

export function LocalUpdateTime({
  updatedAt,
}: LocalUpdateTimeProps) {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(new Date(updatedAt));

  return (
    <span>
      Last update: {formattedTime} · {timeZone}
    </span>
  );
}