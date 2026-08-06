"use client";

import type { PortfolioHealthCharacteristic } from "@/lib/services/portfolio/portfolioHealthProfile";

/**
 * Structural trait rings — investor profile, not holdings.
 */
export function PortfolioDnaRings({
  characteristics,
  identity,
}: {
  characteristics: PortfolioHealthCharacteristic[];
  identity: string;
}) {
  const axes = characteristics.slice(0, 4);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 92;
  const colors = [
    "rgba(129,140,248,0.95)",
    "rgba(167,139,250,0.9)",
    "rgba(56,189,248,0.85)",
    "rgba(251,191,36,0.85)",
  ];

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Investor profile for ${identity}`}
      >
        <defs>
          <radialGradient id="dna-glow-p2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(148,163,184,0.22)" />
            <stop offset="70%" stopColor="rgba(15,23,42,0)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={maxR + 8} fill="url(#dna-glow-p2)" />
        {[0.35, 0.55, 0.75, 1].map((scale) => (
          <circle
            key={scale}
            cx={cx}
            cy={cy}
            r={maxR * scale}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, index) => {
          const radius = maxR * (0.3 + index * 0.17);
          const level = Math.max(0.08, Math.min(1, axis.level));
          const circumference = 2 * Math.PI * radius;
          const dash = circumference * level;
          const gap = circumference - dash;
          return (
            <circle
              key={axis.id}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${-90 + index * 16} ${cx} ${cy})`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={30} fill="rgba(15,23,42,0.95)" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="white"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}
        >
          YOU
        </text>
      </svg>
    </div>
  );
}
