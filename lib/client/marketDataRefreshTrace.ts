/** Client-side refresh trace (enable with NEXT_PUBLIC_MARKET_DATA_DEBUG=1). */
export function logLivePriceRefreshTrace(
  stage: string,
  payload: Record<string, unknown>,
): void {
  if (process.env.NEXT_PUBLIC_MARKET_DATA_DEBUG !== "1") {
    return;
  }

  console.info(`[live-price-trace] ${stage}`, payload);
}
