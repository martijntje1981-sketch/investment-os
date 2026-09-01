/**
 * Authenticated trusted-server NAV capture orchestration.
 * Identity and Product Access are resolved before any snapshot writer client.
 * The browser may supply only portfolioId. All other body fields are ignored.
 */

import type { User } from "@supabase/supabase-js";

import {
  capturePortfolioNavSnapshot,
  NAV_SNAPSHOT_WRITE_AUTHORITY,
  type NavSnapshotClient,
} from "@/lib/services/goalPace/capturePortfolioNavSnapshot";
import {
  isPortfolioNavSnapshotCaptureEnabled,
  type NavSnapshotCaptureEnv,
} from "@/lib/services/goalPace/navSnapshotCaptureFlag";
import type { NavSnapshotCaptureStatus } from "@/lib/services/goalPace/types";
import { resolveProductAccessFromAuthUser } from "@/lib/services/productAccess/resolveFromAuthUser";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrustedNavSnapshotCaptureBody = {
  status: NavSnapshotCaptureStatus;
};

export type RunTrustedNavSnapshotCaptureInput = {
  user: User;
  requestedPortfolioId: string | null;
  now?: Date;
  env?: NavSnapshotCaptureEnv;
  resolveProductAccess?: typeof resolveProductAccessFromAuthUser;
  createSnapshotClient?: () => NavSnapshotClient | null;
  capture?: typeof capturePortfolioNavSnapshot;
};

export function logNavSnapshotCaptureStatus(
  status: NavSnapshotCaptureStatus,
): void {
  console.info("[portfolio-nav-snapshot]", { status });
}

export function readRequestedPortfolioId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { portfolioId?: unknown }).portfolioId;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function httpStatusFor(status: NavSnapshotCaptureStatus): number {
  if (status === "forbidden") return 403;
  return 200;
}

export async function runTrustedNavSnapshotCapture(
  input: RunTrustedNavSnapshotCaptureInput,
): Promise<{ httpStatus: number; body: TrustedNavSnapshotCaptureBody }> {
  if (!isPortfolioNavSnapshotCaptureEnabled(input.env ?? process.env)) {
    logNavSnapshotCaptureStatus("disabled");
    return { httpStatus: 200, body: { status: "disabled" } };
  }

  const requestedPortfolioId = input.requestedPortfolioId;
  if (!requestedPortfolioId) {
    logNavSnapshotCaptureStatus("skipped_unavailable");
    return { httpStatus: 200, body: { status: "skipped_unavailable" } };
  }

  const resolveAccess =
    input.resolveProductAccess ?? resolveProductAccessFromAuthUser;
  const productAccess = await resolveAccess(input.user);

  const createSnapshotClient =
    input.createSnapshotClient ??
    (() => createAdminClient() as NavSnapshotClient | null);
  const snapshotClient = createSnapshotClient();
  if (!snapshotClient) {
    logNavSnapshotCaptureStatus("error");
    return { httpStatus: 200, body: { status: "error" } };
  }

  const capture = input.capture ?? capturePortfolioNavSnapshot;
  const result = await capture({
    client: snapshotClient,
    authority: NAV_SNAPSHOT_WRITE_AUTHORITY,
    userId: input.user.id,
    requestedPortfolioId,
    productAccess,
    now: input.now,
  });

  logNavSnapshotCaptureStatus(result.status);
  return {
    httpStatus: httpStatusFor(result.status),
    body: { status: result.status },
  };
}
