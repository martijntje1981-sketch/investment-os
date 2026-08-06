import { BRAND } from "@/lib/brand";

type TobaileyLogoProps = {
  iconOnly?: boolean;
  showWordmark?: boolean;
  showTagline?: boolean;
  /** Icon diameter in pixels. */
  size?: number;
  /** Adapt wordmark/tagline for dark surfaces. */
  onDark?: boolean;
  className?: string;
  /** Override accessible name. */
  label?: string;
};

/**
 * Tobailey mark: light-blue circle with a white capital T.
 * Prefer this over ad-hoc Sparkles / dark-square branding.
 */
export function TobaileyLogo({
  iconOnly = false,
  showWordmark = !iconOnly,
  showTagline = false,
  size = 40,
  onDark = false,
  className = "",
  label,
}: TobaileyLogoProps) {
  const ariaLabel =
    label ??
    (showTagline
      ? `${BRAND.name} — ${BRAND.tagline}`
      : BRAND.name);

  const wordmarkClass = onDark ? "text-white" : "text-brand-navy";
  const taglineClass = onDark ? "text-white/65" : "text-brand-navy/65";

  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-white"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {/* Geometric capital T */}
        <span
          className="absolute bg-white"
          style={{
            width: size * 0.44,
            height: size * 0.12,
            top: size * 0.28,
            left: size * 0.28,
          }}
        />
        <span
          className="absolute bg-white"
          style={{
            width: size * 0.14,
            height: size * 0.42,
            top: size * 0.28,
            left: size * 0.43,
          }}
        />
      </span>

      {(showWordmark || showTagline) && !iconOnly ? (
        <span className="min-w-0 leading-tight">
          {showWordmark ? (
            <span
              className={`block text-sm font-bold tracking-[-0.02em] sm:text-[15px] ${wordmarkClass}`}
            >
              {BRAND.name}
            </span>
          ) : null}
          {showTagline ? (
            <span
              className={`mt-0.5 block text-[11px] font-medium tracking-[-0.01em] ${taglineClass}`}
            >
              {BRAND.tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
