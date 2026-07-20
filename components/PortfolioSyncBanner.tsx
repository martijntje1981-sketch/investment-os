"use client";

import { AlertTriangle, CloudUpload, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import type { PortfolioSyncPreview } from "@/lib/services/portfolio/types";
import type { ClientPortfolioSyncState } from "@/lib/client/portfolioSyncState";

type PortfolioSyncBannerProps = {
  syncState: ClientPortfolioSyncState;
  migrationPreview: PortfolioSyncPreview | null;
  onMigrate: () => void | Promise<void>;
  onRetry: () => void | Promise<void>;
  onUseRemote: () => void;
  onKeepLocal: () => void;
  migrating?: boolean;
};

function PreviewList({ preview }: { preview: PortfolioSyncPreview }) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
      <li>{preview.holdingCount} holdings total</li>
      <li>
        {preview.investmentCount} investments
        {preview.cashCount > 0
          ? `, ${preview.cashCount} cash (${preview.cashCurrencies.join(", ")})`
          : ""}
      </li>
      {preview.hasGoal ? <li>Financial goal settings</li> : null}
      {preview.mappingCount > 0 ? (
        <li>{preview.mappingCount} confirmed instrument mappings</li>
      ) : null}
    </ul>
  );
}

export default function PortfolioSyncBanner({
  syncState,
  migrationPreview,
  onMigrate,
  onRetry,
  onUseRemote,
  onKeepLocal,
  migrating = false,
}: PortfolioSyncBannerProps) {
  if (syncState.status === "loading") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
        Syncing your portfolio securely…
      </div>
    );
  }

  if (syncState.status === "syncing" || migrating) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading portfolio to secure cloud storage…
      </div>
    );
  }

  if (syncState.status === "migration_offer" && migrationPreview) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-emerald-50">
              Sync portfolio securely
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              We found a portfolio on this device that is not in your cloud
              account yet. Review what will be uploaded — your local copy stays
              on this device.
            </p>
            <PreviewList preview={migrationPreview} />
            <button
              type="button"
              onClick={() => void onMigrate()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <CloudUpload className="h-4 w-4" />
              Confirm secure sync
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (syncState.status === "conflict") {
    return (
      <div className="mb-4 rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-50">Portfolio conflict</p>
            <p className="mt-1 text-sm text-zinc-300">
              This device and your cloud account both have different portfolios.
              Nothing was overwritten. Choose which copy to keep viewing.
            </p>
            {syncState.errorMessage ? (
              <p className="mt-2 text-sm text-amber-200">{syncState.errorMessage}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onUseRemote()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              >
                Use cloud portfolio
              </button>
              <button
                type="button"
                onClick={() => void onKeepLocal()}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-400"
              >
                Keep this device copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (syncState.status === "sync_error") {
    return (
      <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-red-100">{syncState.message}</p>
          {syncState.retryable ? (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-800 px-3 py-1.5 text-sm text-red-100 hover:border-red-600"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (syncState.status === "offline") {
    return (
      <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
        {syncState.message}
      </div>
    );
  }

  return null;
}
