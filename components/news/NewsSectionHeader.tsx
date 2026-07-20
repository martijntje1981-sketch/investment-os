export function NewsSectionHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-5 border-b border-slate-200 pb-6">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
