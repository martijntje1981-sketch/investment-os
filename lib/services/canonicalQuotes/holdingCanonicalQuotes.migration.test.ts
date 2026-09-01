import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const migrationsDir = path.join(repoRoot, "supabase/migrations");
const migrationFile = "20260901140000_holding_canonical_quotes.sql";

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("holding_canonical_quotes migration", () => {
  const sql = read(`supabase/migrations/${migrationFile}`);

  it("creates a purpose-built latest-quote table with EUR and pair fields", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.holding_canonical_quotes/);
    expect(sql).toMatch(/holding_id uuid NOT NULL REFERENCES public\.holdings \(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/canonical_eur_unit_price numeric NOT NULL/);
    expect(sql).toMatch(/pair_price numeric NOT NULL/);
    expect(sql).toMatch(/pair_currency text NOT NULL/);
    expect(sql).toMatch(/fx_to_eur numeric NOT NULL/);
    expect(sql).toMatch(/fx_at timestamptz NOT NULL/);
    expect(sql).toMatch(/quote_updated_at timestamptz NOT NULL/);
    expect(sql).toMatch(/fetched_at timestamptz NOT NULL/);
    expect(sql).toMatch(/holding_canonical_quotes_holding_uidx/);
    expect(sql).not.toMatch(/presentation_currency/);
    expect(sql).not.toMatch(/previous_close numeric/);
  });

  it("uses unconstrained numeric so very small crypto prices are valid", () => {
    expect(sql).toMatch(/canonical_eur_unit_price numeric NOT NULL/);
    expect(sql).not.toMatch(/canonical_eur_unit_price numeric\(/);
    expect(sql).toMatch(/canonical_eur_unit_price > 0/);
    expect(sql).toMatch(/pair_price > 0/);
    expect(sql).toMatch(/fx_to_eur > 0/);
  });

  it("limits status to live or delayed and pair currency to known crypto quotes", () => {
    expect(sql).toMatch(/data_status IN \('live', 'delayed'\)/);
    expect(sql).toMatch(/'USDC', 'USDT'/);
    expect(sql).toMatch(/pair_currency <> 'EUR' OR fx_to_eur = 1/);
  });

  it("enables RLS with no authenticated or anon privileges", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.holding_canonical_quotes ENABLE ROW LEVEL SECURITY/,
    );
    expect(sql).not.toMatch(/FOR SELECT/);
    expect(sql).not.toMatch(/FOR INSERT/);
    expect(sql).not.toMatch(/GRANT SELECT ON public\.holding_canonical_quotes TO authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON public\.holding_canonical_quotes FROM anon/);
    expect(sql).toMatch(/REVOKE ALL ON public\.holding_canonical_quotes FROM authenticated/);
    expect(sql).toMatch(
      /GRANT ALL ON public\.holding_canonical_quotes TO postgres, service_role/,
    );
  });

  it("freezes identity and keeps older quotes from overwriting newer ones", () => {
    expect(sql).toMatch(/NEW\.holding_id := OLD\.holding_id/);
    expect(sql).toMatch(/NEW\.user_id := OLD\.user_id/);
    expect(sql).toMatch(/NEW\.quote_updated_at < OLD\.quote_updated_at/);
    expect(sql).toMatch(/holding_canonical_quotes is crypto-only/);
    expect(sql).toMatch(/ownership mismatch/);
  });

  it("does not backfill or mutate listed holding market-price columns", () => {
    expect(sql).not.toMatch(/INSERT INTO public\.holding_canonical_quotes/i);
    expect(sql).not.toMatch(/ALTER TABLE public\.holdings/);
    expect(sql).not.toMatch(/UPDATE public\.holdings/);
    expect(sql).not.toMatch(/market_quote_cache/);
  });

  it("is the only migration that mentions the new table", () => {
    const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
    const mentions = files.filter((file) =>
      readFileSync(path.join(migrationsDir, file), "utf8").includes(
        "holding_canonical_quotes",
      ),
    );
    expect(mentions).toEqual([migrationFile]);
  });
});
