/**
 * Local integration check for portfolio PUT sync (import save path).
 * Run: node --env-file=.env.local scripts/local-import-sync.integration.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const appUrl = process.env.LOCAL_APP_URL ?? "http://localhost:3000";
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.STAGING_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.STAGING_SUPABASE_ANON_KEY ??
  process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or anon/publishable key in environment.");
  process.exit(1);
}

const stamp = Date.now();

function resolveRemoteHoldingId(userId, localId) {
  const hash = createHash("sha256")
    .update(`investment-os:holding:${userId}:${localId}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

const importHoldings = [
  {
    id: "row-vwce",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: "IE00BK5BQT80",
    providerSymbol: "VWCE.XETRA",
    matchMethod: "manual",
  },
  {
    id: "row-iwda",
    symbol: "IWDA",
    name: "iShares Core MSCI World",
    quantity: 5,
    purchasePrice: 80,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: "IE00B4L5Y983",
    providerSymbol: "IWDA.AS",
    matchMethod: "manual",
  },
  {
    id: "row-strc",
    symbol: "STRC",
    name: "Strategy Inc",
    quantity: 3,
    purchasePrice: 50,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "STRC.AS",
    matchMethod: "manual_exact_listing",
  },
  {
    id: "row-asml",
    symbol: "ASML",
    name: "ASML Holding",
    quantity: 2,
    purchasePrice: 700,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "ASML.AS",
    matchMethod: "manual_exact_listing",
  },
  {
    id: "row-cash",
    symbol: "EUR",
    name: "EUR Cash",
    quantity: 1000,
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    assetType: "cash",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createSession() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const email = `import-sync-${stamp}@yandex.com`;
  const password = `ImportSync!${stamp}`;

  const signedUp = await supabase.auth.signUp({ email, password });
  if (signedUp.error) {
    throw new Error(`signUp failed: ${signedUp.error.message}`);
  }

  let session = signedUp.data.session;
  if (!session) {
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) {
      throw new Error(`signIn failed: ${signedIn.error?.message ?? "no session"}`);
    }
    session = signedIn.data.session;
  }

  return { supabase, session, userId: session.user.id, email };
}

function projectRef() {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

function sessionCookie(session) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  return `sb-${projectRef()}-auth-token=${encodeURIComponent(payload)}`;
}

async function apiFetch(path, session, init = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie(session),
      ...(init.headers ?? {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function main() {
  console.log(`Testing portfolio sync against ${appUrl}`);

  const { supabase, session, userId } = await createSession();
  console.log(`Created test user ${userId.slice(0, 8)}…`);

  const empty = await apiFetch("/api/portfolio", session, { method: "GET" });
  assert(empty.response.status === 200, `GET empty failed: ${empty.response.status}`);
  assert(
    empty.json.snapshot?.holdingCount === 0,
    `Expected empty portfolio, got ${empty.json.snapshot?.holdingCount}`,
  );
  console.log("PASS empty remote portfolio");

  const put = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: `import:${userId}:${stamp}`,
      holdings: importHoldings,
      goal: null,
      importMappings: [],
    }),
  });

  if (!put.response.ok || !put.json.success) {
    console.error("FAIL import PUT sync", {
      status: put.response.status,
      error: put.json.error,
      code: put.json.code,
    });
    process.exit(1);
  }

  assert(
    put.json.snapshot?.holdingCount === 5,
    `Expected 5 holdings, got ${put.json.snapshot?.holdingCount}`,
  );
  console.log("PASS import PUT sync saved 5 holdings");

  const readBack = await apiFetch("/api/portfolio", session, { method: "GET" });
  const symbols = (readBack.json.snapshot?.holdings ?? []).map((h) => h.symbol);
  assert(symbols.includes("VWCE"), "VWCE missing from read-back");
  assert(symbols.includes("STRC"), "STRC missing from read-back");
  assert(
    readBack.json.snapshot?.holdings?.some(
      (h) => h.providerSymbol === "VWCE.XETRA",
    ),
    "provider symbol mapping missing",
  );
  console.log("PASS read-back includes holdings and provider symbols");

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .single();

  const preexistingId = crypto.randomUUID();
  const { error: seedError } = await supabase.from("holdings").insert({
    id: preexistingId,
    portfolio_id: portfolio.id,
    user_id: userId,
    asset_type: "investment",
    symbol: "CONFlict",
    name: "Conflict Seed",
    quantity: 1,
    average_cost: 10,
    currency: "EUR",
    sort_order: 99,
  });
  assert(!seedError, `Seed holding failed: ${seedError?.message}`);

  const conflictLocalId = "row-conflict-reimport";
  const conflictPut = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: `import:${userId}:conflict-${stamp}`,
      holdings: [
        ...importHoldings,
        {
          id: conflictLocalId,
          symbol: "CONFlict",
          name: "Conflict Seed Updated",
          quantity: 4,
          purchasePrice: 12,
          currentPrice: 0,
          currency: "EUR",
          assetType: "investment",
          providerSymbol: "CONFlict.AS",
          matchMethod: "manual_exact_listing",
        },
      ],
      goal: null,
      importMappings: [],
    }),
  });

  if (!conflictPut.response.ok || !conflictPut.json.success) {
    console.error("FAIL symbol-conflict PUT sync", {
      status: conflictPut.response.status,
      error: conflictPut.json.error,
      code: conflictPut.json.code,
    });
    process.exit(1);
  }

  const resolvedConflictId = resolveRemoteHoldingId(userId, conflictLocalId);
  assert(
    resolvedConflictId !== preexistingId,
    "Test setup: local id should not match preexisting row id",
  );
  assert(
    conflictPut.json.snapshot?.holdingCount === 6,
    `Expected 6 holdings after conflict sync, got ${conflictPut.json.snapshot?.holdingCount}`,
  );

  const { data: mapping } = await supabase
    .from("holding_instrument_mappings")
    .select("holding_id, provider_symbol")
    .eq("user_id", userId)
    .eq("provider_symbol", "CONFlict.AS")
    .maybeSingle();

  assert(mapping?.holding_id === preexistingId, "Mapping should attach to existing holding id");
  console.log("PASS symbol-conflict reuses existing holding for mapping");

  console.log("\nAll local import sync checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
