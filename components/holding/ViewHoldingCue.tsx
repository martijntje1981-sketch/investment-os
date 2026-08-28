export const VIEW_HOLDING_CUE = "View holding →";

const cueClass =
  "text-[13px] font-semibold text-brand-navy group-hover:text-brand";

const cueOnDarkClass =
  "text-[12px] font-semibold text-white/45 group-hover:text-brand";

/** Visual cue inside an already-clickable holding row. Never nest a second link. */
export function ViewHoldingCue({
  className = "",
  tone = "onLight",
}: {
  className?: string;
  tone?: "onLight" | "onDark";
}) {
  return (
    <span
      className={`${tone === "onDark" ? cueOnDarkClass : cueClass} ${className}`.trim()}
      data-testid="view-holding-cue"
    >
      {VIEW_HOLDING_CUE}
    </span>
  );
}
