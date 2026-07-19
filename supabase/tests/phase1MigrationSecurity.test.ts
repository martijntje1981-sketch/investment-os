import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const migrationSql = migrationFiles
  .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n");

const userOwnedTables = [
  "profiles",
  "user_settings",
  "portfolios",
  "holdings",
  "holding_instrument_mappings",
  "transactions",
  "financial_goals",
  "import_jobs",
  "import_rows",
  "briefing_snapshots",
];

describe("Phase 1 migration security verification", () => {
  it("includes all expected migration files", () => {
    expect(migrationFiles.length).toBeGreaterThanOrEqual(11);
    expect(migrationFiles.some((file) => file.includes("phase1_rls"))).toBe(
      true,
    );
    expect(
      migrationFiles.some((file) => file.includes("backfill_existing_users")),
    ).toBe(true);
    expect(
      migrationFiles.some((file) => file.includes("aggregate_protection")),
    ).toBe(true);
    expect(
      migrationFiles.some((file) => file.includes("ledger_sequence_ordering")),
    ).toBe(true);
  });

  it("does not contain destructive database operations", () => {
    const forbidden = [
      /DROP DATABASE/i,
      /DROP SCHEMA public/i,
      /TRUNCATE TABLE/i,
      /DELETE FROM auth\.users/i,
    ];

    for (const pattern of forbidden) {
      expect(migrationSql).not.toMatch(pattern);
    }
  });

  it("enables RLS on every user-owned table", () => {
    for (const table of userOwnedTables) {
      expect(migrationSql).toMatch(
        new RegExp(
          `ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`,
          "i",
        ),
      );
    }
  });

  it("defines ownership policies scoped to auth.uid()", () => {
    expect(migrationSql).toMatch(/USING \(user_id = auth\.uid\(\)\)/);
    expect(migrationSql).toMatch(/USING \(id = auth\.uid\(\)\)/);
    expect(migrationSql).toMatch(/WITH CHECK \(user_id = auth\.uid\(\)\)/);
  });

  it("requires user_id on user-owned transactional tables", () => {
    for (const table of userOwnedTables.filter((name) => name !== "profiles")) {
      expect(migrationSql).toMatch(
        new RegExp(
          `CREATE TABLE IF NOT EXISTS public\\.${table}[\\s\\S]*user_id uuid`,
          "i",
        ),
      );
    }
  });

  it("protects SECURITY DEFINER functions with an empty search_path", () => {
    const definerFunctions = migrationSql.match(
      /CREATE OR REPLACE FUNCTION public\.(\w+)[\s\S]*?\$\$;/g,
    );

    expect(definerFunctions).toBeTruthy();

    for (const block of definerFunctions ?? []) {
      if (!/SECURITY DEFINER/i.test(block)) continue;
      expect(block).toMatch(/SET search_path = ''/i);
    }
  });

  it("includes idempotency protections for transactions and import rows", () => {
    expect(migrationSql).toMatch(/transactions_user_idempotency_idx/i);
    expect(migrationSql).toMatch(/import_rows_user_idempotency_idx/i);
  });

  it("prevents duplicate primary portfolios and daily briefing snapshots", () => {
    expect(migrationSql).toMatch(/portfolios_one_primary_per_user_idx/i);
    expect(migrationSql).toMatch(
      /briefing_snapshots_user_portfolio_date_idx/i,
    );
  });

  it("defaults timezone to Europe/Amsterdam and stores timestamptz columns", () => {
    expect(migrationSql).toMatch(
      /timezone text NOT NULL DEFAULT 'Europe\/Amsterdam'/,
    );
    expect(migrationSql).toMatch(/created_at timestamptz/i);
    expect(migrationSql).toMatch(/public\.briefing_local_date/i);
  });

  it("revokes public execution of sensitive definer functions", () => {
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.recalculate_holding_aggregate\(uuid\) FROM PUBLIC/i,
    );
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC/i,
    );
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.backfill_existing_auth_users\(\) FROM PUBLIC/i,
    );
  });

  it("protects ledger-derived holding columns from direct authenticated updates", () => {
    expect(migrationSql).toMatch(/guard_holding_aggregate_columns/i);
    expect(migrationSql).toMatch(
      /REVOKE UPDATE ON public\.holdings FROM authenticated/i,
    );
    expect(migrationSql).toMatch(/GRANT UPDATE \(\s*symbol,/i);
    expect(migrationSql).toMatch(/investment_os\.allow_aggregate_update/i);
  });

  it("requires committed import rows before linked transactions", () => {
    expect(migrationSql).toMatch(/validate_transaction_import_commit/i);
    expect(migrationSql).toMatch(/status committed/i);
  });

  it("includes an idempotent backfill for existing auth users", () => {
    expect(migrationSql).toMatch(/backfill_existing_auth_users/i);
    expect(migrationSql).toMatch(/WHERE NOT EXISTS/i);
  });

  it("uses deterministic ledger ordering for aggregate recalculation", () => {
    expect(migrationSql).toMatch(/ledger_sequence/i);
    expect(migrationSql).toMatch(
      /ORDER BY t\.executed_at ASC, t\.ledger_sequence ASC/i,
    );
    expect(migrationSql).toMatch(/transactions_ledger_sequence_seq/i);
  });

  it("resets the aggregate guard bypass flag after ledger recalculation", () => {
    expect(migrationSql).toMatch(
      /set_config\('investment_os\.allow_aggregate_update', 'off', true\)/i,
    );
  });
});
