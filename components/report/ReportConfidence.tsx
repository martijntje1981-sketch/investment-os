type ReportConfidenceProps = {
  notes: string[];
};

export function ReportConfidence({ notes }: ReportConfidenceProps) {
  if (notes.length === 0) return null;
  return (
    <section className="border-t border-slate-100 px-5 py-5 sm:px-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Data confidence
      </p>
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li key={note} className="text-[13px] leading-relaxed text-slate-600">
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}
