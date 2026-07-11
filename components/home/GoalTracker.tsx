import { Card } from "@/components/ui/Card";
import { formatEuro } from "@/lib/home-data";

type GoalTrackerProps = {
  target: number;
  current: number;
  progress: number;
  yearsRemaining: number;
};

export function GoalTracker({
  target,
  current,
  progress,
  yearsRemaining,
}: GoalTrackerProps) {
  return (
    <Card className="p-8">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Goal Tracker
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">Target</p>
          <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]">
            {formatEuro(target)}
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#64748B]">
            Current Portfolio
          </p>
          <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]">
            {formatEuro(current)}
          </p>
        </div>
      </div>
      <div className="mt-8">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
          <div
            className="h-full rounded-full bg-[#0F172A]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[13px] text-[#64748B]">Current progress</p>
          <p className="text-[13px] font-semibold text-[#0F172A]">
            {progress}%
          </p>
        </div>
      </div>
      <p className="mt-6 text-[14px] text-[#64748B]">
        Estimated time remaining at current pace:{" "}
        <span className="font-medium text-[#0F172A]">
          {yearsRemaining} years
        </span>
      </p>
    </Card>
  );
}
