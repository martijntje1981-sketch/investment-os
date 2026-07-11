import { Card } from "@/components/ui/Card";

const indicatorStyles = {
  orange: "bg-[#FFF7ED] text-[#EA580C]",
  green: "bg-[#ECFDF5] text-[#16A34A]",
  blue: "bg-[#EFF6FF] text-[#2563EB]",
} as const;

const indicatorEmoji = {
  orange: "🟠",
  green: "🟢",
  blue: "🔵",
} as const;

type BriefingCardProps = {
  label: string;
  indicator: keyof typeof indicatorStyles;
  text: string;
};

export function BriefingCard({ label, indicator, text }: BriefingCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${indicatorStyles[indicator]}`}
          aria-hidden
        >
          {indicatorEmoji[indicator]}
        </span>
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#0F172A]">
            {label}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#475569]">
            {text}
          </p>
        </div>
      </div>
    </Card>
  );
}
