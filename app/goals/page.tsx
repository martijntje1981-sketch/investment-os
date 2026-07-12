type CardProps = {
  title?: string;
  value?: string;
  subtitle?: string;
  change?: string;
  positive?: boolean;
  children?: React.ReactNode;
};

export default function Card({
  title,
  value,
  subtitle,
  change,
  positive = true,
  children,
}: CardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      {title && (
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
      )}

      {value && (
        <h2 className="mt-3 text-4xl font-bold text-slate-900">
          {value}
        </h2>
      )}

      {subtitle && (
        <p className="mt-2 text-slate-500">
          {subtitle}
        </p>
      )}

      {change && (
        <div
          className={`mt-5 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {change}
        </div>
      )}

      {children && (
        <div className="mt-5">
          {children}
        </div>
      )}

    </div>
  );
}