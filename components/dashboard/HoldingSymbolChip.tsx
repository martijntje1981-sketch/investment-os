/**
 * Compact symbol chip when no instrument logo exists in Tobailey.
 * Answers “which holding?” without fabricating imagery.
 */

function initialsFromSymbol(symbol: string): string {
  const cleaned = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length <= 3) return cleaned || "?";
  return cleaned.slice(0, 3);
}

export function HoldingSymbolChip({
  symbol,
  size = 32,
  className,
}: {
  symbol: string | null | undefined;
  size?: 28 | 32 | 36;
  className?: string;
}) {
  if (typeof symbol !== "string" || !symbol.trim()) {
    return null;
  }

  const label = initialsFromSymbol(symbol);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold tracking-tight text-slate-700 ring-1 ring-slate-200/80 ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
      data-testid="holding-symbol-chip"
      data-symbol={symbol.trim().toUpperCase()}
    >
      {label}
    </span>
  );
}
