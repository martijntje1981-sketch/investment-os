import { Card } from "@/components/ui/Card";

type Event = {
  when: string;
  title: string;
  description: string;
};

type UpcomingEventsProps = {
  events: Event[];
};

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <section>
      <h2 className="mb-5 text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Upcoming Events
      </h2>
      <Card className="overflow-hidden p-0">
        {events.map((event, index) => (
          <div
            key={event.title}
            className={`flex gap-5 px-6 py-5 ${index !== events.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
          >
            <div className="relative flex flex-col items-center pt-1.5">
              <div className="z-10 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0F172A]" />
              {index < events.length - 1 && (
                <div className="absolute top-4 bottom-0 w-px bg-[#E2E8F0]" />
              )}
            </div>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#94A3B8]">
                {event.when}
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
                {event.title}
              </p>
              <p className="mt-0.5 text-[14px] text-[#64748B]">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
