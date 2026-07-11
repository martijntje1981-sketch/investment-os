import { BriefingCard } from "@/components/home/BriefingCard";

type BriefingItem = {
  label: string;
  indicator: "orange" | "green" | "blue";
  text: string;
};

type TodaysBriefingProps = {
  items: BriefingItem[];
};

export function TodaysBriefing({ items }: TodaysBriefingProps) {
  return (
    <section>
      <h2 className="mb-5 text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Today&apos;s Briefing
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <BriefingCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
