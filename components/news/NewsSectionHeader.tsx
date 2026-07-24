import {
  appNewsEyebrowClass,
  appNewsSectionDescriptionClass,
  appNewsSectionTitleClass,
} from "@/components/layout/appSurface";

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
        <p className={appNewsEyebrowClass}>{eyebrow}</p>
        <h2 className={appNewsSectionTitleClass}>{title}</h2>
        <p className={appNewsSectionDescriptionClass}>{description}</p>
      </div>
    </div>
  );
}
