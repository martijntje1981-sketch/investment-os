/**
 * Shared publisher / featured-person display for Perspectives cards.
 */

export function PerspectivePublisherLabel({
  channelOwnerName,
  featuredPersonName,
  isTrustedSource,
  className = "",
}: {
  channelOwnerName: string;
  featuredPersonName?: string | null;
  isTrustedSource?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="truncate text-[15px] font-bold text-brand-navy">
        {channelOwnerName}
        {isTrustedSource ? (
          <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
            Trusted
          </span>
        ) : null}
      </p>
      {featuredPersonName &&
      featuredPersonName.toLowerCase() !== channelOwnerName.toLowerCase() ? (
        <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
          Featuring {featuredPersonName}
        </p>
      ) : null}
    </div>
  );
}
