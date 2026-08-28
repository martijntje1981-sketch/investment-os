"use client";

import { useMemo } from "react";

import { AnalysisIntro } from "@/components/analysis/glance/AnalysisIntro";
import { AnalysisCoverageBanner } from "@/components/analysis/glance/AnalysisCoverageBanner";
import { AnalysisStanceBlock } from "@/components/analysis/glance/AnalysisStanceBlock";
import { AnalysisAttentionBlock } from "@/components/analysis/glance/AnalysisAttentionBlock";
import { AnalysisOutlookBlock } from "@/components/analysis/glance/AnalysisOutlookBlock";
import { AnalysisExploreNav } from "@/components/analysis/glance/AnalysisExploreNav";
import { AnalysisDetailView } from "@/components/analysis/glance/AnalysisDetailView";
import { readNewsCache } from "@/lib/client/portfolioNews";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro";
import { useProductAccess } from "@/lib/client/useProductAccess";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { appDashboardDarkMetaClass } from "@/components/layout/appSurface";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildAnalysisGlance } from "@/lib/services/analysisGlance";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { useAnalysisDetailId } from "@/lib/client/useAnalysisDetailId";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { resolveIntelligenceScope } from "@/lib/services/intelligenceScope";

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function PortfolioAnalysisPage() {
  const { formatEur, baseCurrency, convertEur } = useBaseCurrencyDisplay();
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
    saveHoldings,
  } = useUserPortfolio();
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));
  const detailId = useAnalysisDetailId();

  const { goal, hasSavedGoal, persistGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { realityCheck } = useGoalRealityCheck(
    holdings,
    goal,
    holdings.length > 0 && hasSavedGoal,
  );

  const intelligenceScope = useMemo(
    () => resolveIntelligenceScope().scope,
    [],
  );

  const loadDividends =
    holdings.length > 0 && detailId === "dividend-intelligence";
  const { quotes, isLoading: dividendsLoading } = usePortfolioDividends(
    holdings,
    userSub,
    loadDividends,
  );

  const analysis = useMemo(() => buildPortfolioAnalysis(holdings), [holdings]);
  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
    [holdings],
  );

  const contributionHoldings = useMemo(
    () =>
      holdings.map((holding) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
      })),
    [holdings],
  );
  const { entries: contributionEntries } = usePortfolioContributions(
    performance.totalValue,
    performance.totalValueAvailable,
    holdings.length > 0,
    contributionHoldings,
  );

  const exposureAllocation = useMemo(
    () => buildPortfolioExposureAllocation(holdings),
    [holdings],
  );

  const glance = useMemo(
    () =>
      buildAnalysisGlance({
        holdings,
        analysis,
        allocation: exposureAllocation,
        goal,
        hasSavedGoal,
      }),
    [holdings, analysis, exposureAllocation, goal, hasSavedGoal],
  );

  const needsRateContext =
    detailId === "portfolio-exposure" || detailId === "bonds-rates";
  const ratePolicyContext = useMemo(() => {
    if (!userSub || !exposureAllocation.fixedIncome || !needsRateContext) {
      return null;
    }
    const cached = readNewsCache(userSub);
    if (!cached?.response) return null;
    return selectOfficialRatePolicyContext([
      ...cached.response.portfolioNews,
      ...cached.response.macroNews,
    ]);
  }, [exposureAllocation.fixedIncome, needsRateContext, userSub]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const hasHoldings = holdings.length > 0;
  const updatedAt = formatUpdatedAt(analysis.lastUpdatedAt);
  const showUnvaluedWarning =
    glance.coverageComplete && analysis.unvaluedHoldings.length > 0;

  return (
    <>
      <PageContainer canvas="analysis">
        {!detailId || !hasHoldings ? (
          <AnalysisIntro
            updatedLabel={updatedAt ? `Updated ${updatedAt}` : null}
          />
        ) : null}

        <PortfolioRecoveryBanner
          offer={recoveryOffer}
          onRecover={() => {
            recoverPortfolio();
          }}
          onDismiss={dismissRecovery}
        />

        {!hasHoldings ? (
          <EmptyPortfolioGuide
            title="No portfolio to analyse yet"
            body="Import a CSV or Excel file, or add holdings manually, to see allocation, concentration and diversification insights."
          />
        ) : (
          <div data-intelligence-scope={intelligenceScope}>
            {detailId ? (
              <AnalysisDetailView
                detailId={detailId}
                holdings={holdings}
                analysis={analysis}
                exposureAllocation={exposureAllocation}
                productAccess={productAccess}
                userSub={userSub}
                goal={goal}
                hasSavedGoal={hasSavedGoal}
                persistGoal={persistGoal}
                goalProgress={goalProgress}
                realityCheck={realityCheck}
                ratePolicyContext={ratePolicyContext}
                dividendQuotes={quotes}
                dividendsLoading={dividendsLoading}
                formatEur={formatEur}
                onPolicyOverrideChange={(holdingId, value) => {
                  saveHoldings(
                    holdings.map((holding) =>
                      holding.id === holdingId
                        ? { ...holding, distributionPolicyUserOverride: value }
                        : holding,
                    ),
                  );
                }}
                onPassiveIncomeEstimateChange={(holdingId, estimate) => {
                  saveHoldings(
                    holdings.map((holding) =>
                      holding.id === holdingId
                        ? {
                            ...holding,
                            passiveIncomeUserEstimate: estimate ?? undefined,
                          }
                        : holding,
                    ),
                  );
                }}
              />
            ) : (
              <>
                {glance.coverageMessage ? (
                  <div className="mt-1">
                    <AnalysisCoverageBanner message={glance.coverageMessage} />
                  </div>
                ) : showUnvaluedWarning ? (
                  <div className="mt-1">
                    <AnalysisCoverageBanner
                      message={`${analysis.unvaluedHoldings.length} ${
                        analysis.unvaluedHoldings.length === 1
                          ? "holding is"
                          : "holdings are"
                      } excluded from valued totals because a usable current price is missing.`}
                    />
                  </div>
                ) : null}

                <div
                  data-testid="analysis-primary"
                  className="space-y-3 lg:space-y-4"
                >
                  <div className="grid gap-3 lg:grid-cols-2">
                    <AnalysisStanceBlock view={glance.stance} />
                    <AnalysisAttentionBlock view={glance.attention} />
                  </div>
                  <AnalysisOutlookBlock view={glance.outlook} />
                </div>

                <AnalysisExploreNav
                  tools={
                    <div className="min-w-0">
                      <p className={appDashboardDarkMetaClass}>
                        Download your portfolio data
                      </p>
                      <ExportPortfolioButton
                        variant="onDark"
                        className="mt-1.5"
                        onExport={() =>
                          runPortfolioExport({
                            holdings,
                            entries: contributionEntries,
                            portfolioValueEur: performance.totalValue,
                            portfolioValueAvailable:
                              performance.totalValueAvailable,
                            baseCurrency,
                            convertEur,
                          })
                        }
                      />
                    </div>
                  }
                />
              </>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
