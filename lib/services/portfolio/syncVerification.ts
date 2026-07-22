import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { portfoliosPersistedMatch } from "@/lib/services/portfolio/idempotency";
import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

export const SYNC_VERIFICATION_RETRY_DELAYS_MS = [0, 75, 200] as const;

export async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function verifyPersistedPortfolioSnapshot(
  repo: PortfolioRepository,
  userId: string,
  writtenHoldings: StoredPortfolioHolding[],
  initialSnapshot: RemotePortfolioSnapshot,
  options?: {
    retryDelaysMs?: readonly number[];
    wait?: typeof delay;
  },
): Promise<boolean> {
  const retryDelaysMs =
    options?.retryDelaysMs ?? SYNC_VERIFICATION_RETRY_DELAYS_MS;
  const wait = options?.wait ?? delay;

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    if (attempt > 0) {
      await wait(retryDelaysMs[attempt]!);
    }

    const snapshot =
      attempt === 0 ? initialSnapshot : await repo.fetchSnapshot(userId);

    if (portfoliosPersistedMatch(writtenHoldings, snapshot.holdings)) {
      return true;
    }
  }

  return false;
}
