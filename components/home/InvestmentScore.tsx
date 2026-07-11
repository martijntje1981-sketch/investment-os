import { Card } from "@/components/ui/Card";

type InvestmentScoreProps = {
  score: number;
  badge: string;
  explanation: string;
};

export function InvestmentScore({
  score,
  badge,
  explanation,
}: InvestmentScoreProps) {
  return (
    <Card className="p-8">
      <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
        Investment Score
      </p>
      <div className="mt-4 flex items-end gap-4">
        <span className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-[#0F172A] sm:text-[64px]">
          {score}
        </span>
        <span className="mb-2 inline-flex items-center rounded-full bg-[#ECFDF5] px-3 py-1 text-[13px] font-medium text-[#16A34A]">
          {badge}
        </span>
      </div>
      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#64748B]">
        {explanation}
      </p>
    </Card>
  );
}
