type ReportEvidenceListProps = {
  items: string[];
};

export function ReportEvidenceList({ items }: ReportEvidenceListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="text-[13px] leading-relaxed text-slate-600 before:mr-2 before:text-slate-300 before:content-['·']"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
