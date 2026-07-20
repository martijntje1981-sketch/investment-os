import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import type {
  PortfolioSyncPreview,
  RemotePortfolioSnapshot,
} from "@/lib/services/portfolio/types";

export type PortfolioSyncMeta = {
  version: string;
  lastMigrationIdempotencyKey?: string;
  lastMigrationFingerprint?: string;
  lastSuccessfulRemoteAt?: string;
  lastSyncError?: string | null;
};

export type FetchRemotePortfolioResult =
  | { ok: true; snapshot: RemotePortfolioSnapshot }
  | { ok: false; unauthorized: true }
  | { ok: false; offline: true }
  | { ok: false; error: string; code?: string };

export type MigratePortfolioResult =
  | {
      ok: true;
      snapshot: RemotePortfolioSnapshot;
      preview?: PortfolioSyncPreview;
      verified: boolean;
    }
  | { ok: false; unauthorized: true }
  | { ok: false; error: string; code?: string; retryable: boolean };

export type PushPortfolioResult =
  | { ok: true; snapshot: RemotePortfolioSnapshot }
  | { ok: false; unauthorized: true }
  | { ok: false; error: string; code?: string; retryable: boolean };

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch/i.test(error.message))
  );
}

export async function fetchRemotePortfolio(): Promise<FetchRemotePortfolioResult> {
  try {
    const response = await fetch("/api/portfolio", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      return { ok: false, unauthorized: true };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      snapshot?: RemotePortfolioSnapshot;
      error?: string;
      code?: string;
    };

    if (!response.ok || !payload.success || !payload.snapshot) {
      return {
        ok: false,
        error: payload.error ?? "Failed to load remote portfolio.",
        code: payload.code,
      };
    }

    return { ok: true, snapshot: payload.snapshot };
  } catch (error) {
    if (isNetworkError(error)) {
      return { ok: false, offline: true };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

export async function migratePortfolioToRemote(input: {
  idempotencyKey: string;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  importMappings: SavedImportMapping[];
  localFingerprint: string;
}): Promise<MigratePortfolioResult> {
  try {
    const response = await fetch("/api/portfolio/migrate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.status === 401) {
      return { ok: false, unauthorized: true };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      snapshot?: RemotePortfolioSnapshot;
      preview?: PortfolioSyncPreview;
      verified?: boolean;
      error?: string;
      code?: string;
    };

    if (!response.ok || !payload.success || !payload.snapshot) {
      return {
        ok: false,
        error: payload.error ?? "Migration failed.",
        code: payload.code,
        retryable: response.status >= 500 || response.status === 408,
      };
    }

    return {
      ok: true,
      snapshot: payload.snapshot,
      preview: payload.preview,
      verified: payload.verified === true,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Migration failed.",
      retryable: true,
    };
  }
}

export async function pushPortfolioToRemote(input: {
  idempotencyKey: string;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  importMappings?: SavedImportMapping[];
}): Promise<PushPortfolioResult> {
  try {
    const response = await fetch("/api/portfolio", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.status === 401) {
      return { ok: false, unauthorized: true };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      snapshot?: RemotePortfolioSnapshot;
      error?: string;
      code?: string;
    };

    if (!response.ok || !payload.success || !payload.snapshot) {
      return {
        ok: false,
        error: payload.error ?? "Sync failed.",
        code: payload.code,
        retryable: response.status >= 500 || response.status === 408,
      };
    }

    return { ok: true, snapshot: payload.snapshot };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sync failed.",
      retryable: true,
    };
  }
}
