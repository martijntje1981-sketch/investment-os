import { Card } from "@/components/ui/Card";

type TodayStatusProps = {
  message: string;
  explanation: string;
};

export function TodayStatus({ message, explanation }: TodayStatusProps) {
  return (
    <Card className="p-8 sm:p-10">
      <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
        Today&apos;s Status
      </p>
      <div className="mt-8 flex flex-col items-center text-center sm:mt-10">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ECFDF5] sm:h-24 sm:w-24"
          aria-hidden
        >
          <span className="text-[40px] leading-none sm:text-[48px]">🟢</span>
        </div>
        <p className="mt-6 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A] sm:text-[26px]">
          {message}
        </p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#64748B]">
          {explanation}
        </p>
      </div>
    </Card>
  );
}
