import type { AccessiblePortfolio } from "@/lib/services/portfolios/access";

export type PortfoliosResponse = {
  success: boolean;
  maxPortfolios?: number;
  canCreate?: boolean;
  portfolios?: AccessiblePortfolio[];
  error?: string;
  code?: string;
};

export async function fetchUserPortfolios(): Promise<PortfoliosResponse> {
  const response = await fetch("/api/portfolios", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return (await response.json()) as PortfoliosResponse;
}

export async function createUserPortfolio(name: string): Promise<
  | { ok: true; portfolio: AccessiblePortfolio }
  | { ok: false; error: string; code?: string; status: number }
> {
  const response = await fetch("/api/portfolios", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    portfolio?: AccessiblePortfolio;
    error?: string;
    code?: string;
  };
  if (!response.ok || !payload.success || !payload.portfolio) {
    return {
      ok: false,
      error: payload.error ?? "Could not create the portfolio.",
      code: payload.code,
      status: response.status,
    };
  }
  return { ok: true, portfolio: payload.portfolio };
}

export async function renameUserPortfolio(
  portfolioId: string,
  name: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const response = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    name?: string;
    error?: string;
  };
  if (!response.ok || !payload.success || !payload.name) {
    return { ok: false, error: payload.error ?? "Could not rename the portfolio." };
  }
  return { ok: true, name: payload.name };
}
