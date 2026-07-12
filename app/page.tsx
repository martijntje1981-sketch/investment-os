import { holdings } from "@/lib/services/portfolio/holdings";
import { LocalUpdateTime } from "@/components/home/LocalUpdateTime";
import { BottomNav } from "@/components/home/BottomNav";
import { GoalTracker } from "@/components/home/GoalTracker";
import { InvestmentScore } from "@/components/home/InvestmentScore";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import { TodayStatus } from "@/components/home/TodayStatus";
import { TodaysBriefing } from "@/components/home/TodaysBriefing";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { homeData } from "@/lib/home-data";
import { getMarketQuote } from "@/lib/services/market/priceService";

export default async function Home() {
  const primaryHolding = holdings[0];
  const liveQuote = await getMarketQuote(primaryHolding.symbol);
  const { status, briefing, investmentScore, portfolio, goal, events } =
    homeData;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1200px] px-6 pt-12 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] sm:px-8 sm:pt-16">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-[40px]">
          {homeData.greeting}
        </h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
  Live {primaryHolding.name}
</p>

  <p className="mt-2 text-4xl font-bold">
    ${liveQuote.price.toLocaleString()}
  </p>
  <p
  className={`mt-2 text-sm font-medium ${
    liveQuote.changePercent >= 0 ? "text-green-600" : "text-red-600"
  }`}
>
  {liveQuote.changePercent >= 0 ? "+" : ""}
  {liveQuote.changePercent.toFixed(2)}% today
</p>

  <p className="mt-2 text-sm text-slate-500">
  <LocalUpdateTime updatedAt={liveQuote.updatedAt} />
</p>
</div>

        <div className="mt-10 flex flex-col gap-12 sm:mt-12 sm:gap-14">
          <TodayStatus
            message={status.message}
            explanation={status.explanation}
          />

          <TodaysBriefing items={briefing} />

          <InvestmentScore
            score={investmentScore.score}
            badge={investmentScore.badge}
            explanation={investmentScore.explanation}
          />

          <PortfolioSnapshot
            totalValue={portfolio.totalValue}
            todayChange={portfolio.todayChange}
            todayPercent={portfolio.todayPercent}
            bestHolding={portfolio.bestHolding}
            worstHolding={portfolio.worstHolding}
          />

          <GoalTracker
            target={goal.target}
            current={goal.current}
            progress={goal.progress}
            yearsRemaining={goal.yearsRemaining}
          />

          <UpcomingEvents events={events} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
