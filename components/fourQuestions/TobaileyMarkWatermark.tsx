/**
 * Large decorative T mark for hub heroes — same geometry as TobaileyLogo.
 * Low opacity; decorative only.
 */
export function TobaileyMarkWatermark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute select-none ${className}`}
      aria-hidden="true"
      data-testid="question-hub-t-watermark"
    >
      <div className="relative h-[220px] w-[220px] rounded-full bg-white/10 sm:h-[280px] sm:w-[280px]">
        <span
          className="absolute bg-white/25"
          style={{
            width: "44%",
            height: "12%",
            top: "28%",
            left: "28%",
          }}
        />
        <span
          className="absolute bg-white/25"
          style={{
            width: "14%",
            height: "42%",
            top: "28%",
            left: "43%",
          }}
        />
      </div>
    </div>
  );
}
