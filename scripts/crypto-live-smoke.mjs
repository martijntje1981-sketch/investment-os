/**
 * Live crypto persistence smoke test against the linked Supabase project.
 *
 * Usage:
 *   SUPABASE_SMOKE_TEST_EMAIL=... SUPABASE_SMOKE_TEST_PASSWORD=... node scripts/crypto-live-smoke.mjs
 *
 * Requires:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and publishable key
 *   - A dedicated smoke-test account provisioned outside this script
 *   - `npm run dev` on APP_URL (default http://localhost:3000)
 *
 * Do not use placeholder domains, disposable public inboxes, or production user accounts.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveCryptoDisplayPrice(holding) {
  if (Number.isFinite(holding.currentPrice) && holding.currentPrice > 0) {
    return { price: holding.currentPrice, source: "live" };
  }
  if (holding.pricingStatus === "manual") {
    if (
      Number.isFinite(holding.currentManualPrice) &&
      holding.currentManualPrice > 0
    ) {
      return { price: holding.currentManualPrice, source: "estimated" };
    }
    if (
      Number.isFinite(holding.manualCurrentValue) &&
      holding.manualCurrentValue > 0 &&
      Number.isFinite(holding.quantity) &&
      holding.quantity > 0
    ) {
      return {
        price: holding.manualCurrentValue / holding.quantity,
        source: "estimated",
      };
    }
  }
  return { price: null, source: "unavailable" };
}

function holdingValueUnavailableLabel(holding) {
  return holding.assetType === "crypto" ? "Value unavailable" : "Price unavailable";
}

const env = loadEnvLocal();
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_SMOKE_TEST_EMAIL;
const password = process.env.SUPABASE_SMOKE_TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or publishable key in .env.local");
  process.exit(1);
}

if (!email || !password) {
  console.error(
    "Missing SUPABASE_SMOKE_TEST_EMAIL or SUPABASE_SMOKE_TEST_PASSWORD. Provision a dedicated smoke-test account and pass credentials via environment variables only.",
  );
  process.exit(1);
}

const blockedEmailPattern =
  /@(?:example\.com|test\.com|invalid|yandex\.com|mailinator\.com)$/i;
if (blockedEmailPattern.test(email)) {
  console.error(
    "Refusing smoke test: SUPABASE_SMOKE_TEST_EMAIL uses a blocked placeholder or public disposable domain.",
  );
  process.exit(1);
}

const expectedRef = "fdxtsfgzsyuqcwgumwsp";
const actualRef = new URL(supabaseUrl).hostname.split(".")[0];
if (actualRef !== expectedRef) {
  console.error(`Refusing smoke test: env ref ${actualRef} != ${expectedRef}`);
  process.exit(1);
}

const stamp = Date.now();

const seedInvestment = {
  id: crypto.randomUUID(),
  symbol: "VWCE",
  name: "Vanguard FTSE All-World",
  quantity: 3,
  purchasePrice: 100,
  currentPrice: 105,
  currency: "EUR",
  assetType: "investment",
};

const seedCash = {
  id: crypto.randomUUID(),
  symbol: "EUR",
  name: "EUR Cash",
  quantity: 500,
  purchasePrice: 1,
  currentPrice: 1,
  currency: "EUR",
  assetType: "cash",
};

function makeCrypto({ id, symbol, name, amount, pairCurrency, purchasePrice }) {
  const tradingPair = `${symbol}/${pairCurrency}`;
  return {
    id,
    assetType: "crypto",
    symbol,
    name,
    quantity: amount,
    purchasePrice: purchasePrice ?? 45000,
    currentPrice: 0,
    currency: "EUR",
    portfolioCurrency: "EUR",
    pairCurrency,
    pricingStatus: "price_unavailable",
    tradingPair,
    platform: "Kraken",
    priceDataStatus: "unavailable",
    providerSymbol: null,
    isin: null,
    exchange: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

let btc = makeCrypto({
  id: crypto.randomUUID(),
  symbol: "BTC",
  name: "Bitcoin",
  amount: 0.25,
  pairCurrency: "EUR",
  purchasePrice: 42000,
});
let eth = makeCrypto({
  id: crypto.randomUUID(),
  symbol: "ETH",
  name: "Ethereum",
  amount: 2.5,
  pairCurrency: "USDC",
  purchasePrice: 2800,
});

function sessionCookie(session) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  return `sb-${actualRef}-auth-token=${encodeURIComponent(payload)}`;
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
  const results = [];
  const record = (name, passed, detail = "") => {
    results.push({ name, passed, detail });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const supabase = createClient(supabaseUrl, supabaseKey);
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    throw new Error(
      `signIn failed: ${signedIn.error?.message ?? "no session — verify SUPABASE_SMOKE_TEST_* credentials"}`,
    );
  }
  let session = signedIn.data.session;

  const migrateKey = `migrate:crypto-smoke:${stamp}`;

  const initialGet = await apiFetch("/api/portfolio", session, { method: "GET" });
  let baseHoldings = initialGet.json.snapshot?.holdings ?? [];
  const hasSeed =
    baseHoldings.some((h) => h.symbol === "VWCE" && h.assetType === "investment") &&
    baseHoldings.some((h) => h.assetType === "cash");

  if (!hasSeed && baseHoldings.length === 0) {
    const migrate = await apiFetch("/api/portfolio/migrate", session, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: migrateKey,
        holdings: [seedInvestment, seedCash],
        localFingerprint: `fp-${stamp}`,
      }),
    });
    record(
      "Seed investment and cash via migrate",
      migrate.response.status === 200 &&
        migrate.json.success === true &&
        migrate.json.snapshot?.holdings?.some((h) => h.symbol === "VWCE") &&
        migrate.json.snapshot?.holdings?.some((h) => h.assetType === "cash"),
      `status=${migrate.response.status}`,
    );
  } else {
    record(
      "Seed investment and cash already present or skipped",
      hasSeed || baseHoldings.length === 0,
      `count=${baseHoldings.length}`,
    );
  }

  const seededGet = await apiFetch("/api/portfolio", session, { method: "GET" });
  baseHoldings = seededGet.json.snapshot?.holdings ?? [];
  assert(
    baseHoldings.some((h) => h.symbol === "VWCE") &&
      baseHoldings.some((h) => h.assetType === "cash"),
    "Expected seeded investment and cash holdings before crypto sync",
  );

  btc = { ...btc, id: crypto.randomUUID() };
  eth = { ...eth, id: crypto.randomUUID() };
  const btcId = btc.id;
  const ethId = eth.id;

  const saveKey = `save:crypto-smoke:${stamp}`;
  const nonCryptoBase = baseHoldings.filter((h) => h.assetType !== "crypto");
  const withCrypto = [...nonCryptoBase, btc, eth];
  const putCrypto = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: saveKey,
      holdings: withCrypto,
    }),
  });
  record(
    "Add BTC/EUR and ETH/USDC",
    putCrypto.response.status === 200 &&
      putCrypto.json.success === true &&
      putCrypto.json.snapshot?.holdings?.some(
        (h) => h.assetType === "crypto" && h.symbol === "BTC" && h.pairCurrency === "EUR",
      ) &&
      putCrypto.json.snapshot?.holdings?.some(
        (h) => h.assetType === "crypto" && h.symbol === "ETH" && h.pairCurrency === "USDC",
      ),
    `status=${putCrypto.response.status} code=${putCrypto.json.code ?? ""} error=${putCrypto.json.error ?? ""}`,
  );

  const refresh = await apiFetch("/api/portfolio", session, { method: "GET" });
  const refreshHoldings = refresh.json.snapshot?.holdings ?? [];
  record(
    "Refresh read-back preserves all holdings",
    refreshHoldings.some((h) => h.symbol === "VWCE") &&
      refreshHoldings.some((h) => h.assetType === "cash") &&
      refreshHoldings.some((h) => h.symbol === "BTC" && h.pairCurrency === "EUR") &&
      refreshHoldings.some((h) => h.symbol === "ETH" && h.pairCurrency === "USDC"),
    `count=${refreshHoldings.length}`,
  );

  const repeatPut = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: saveKey,
      holdings: refreshHoldings,
    }),
  });
  record(
    "Repeated identical sync returns 200",
    repeatPut.response.status === 200 && repeatPut.json.success === true,
    `status=${repeatPut.response.status}`,
  );

  await supabase.auth.signOut();
  const afterLogout = await apiFetch("/api/portfolio", session, { method: "GET" });
  record("Logout blocks portfolio GET", afterLogout.response.status === 401);

  const relogin = await supabase.auth.signInWithPassword({ email, password });
  assert(relogin.data.session, "Re-login failed");
  session = relogin.data.session;

  const afterRelogin = await apiFetch("/api/portfolio", session, { method: "GET" });
  const reloginHoldings = afterRelogin.json.snapshot?.holdings ?? [];
  record(
    "Re-login preserves crypto holdings",
    reloginHoldings.some((h) => h.symbol === "BTC" && h.pairCurrency === "EUR") &&
      reloginHoldings.some((h) => h.symbol === "ETH" && h.pairCurrency === "USDC"),
    `count=${reloginHoldings.length}`,
  );

  const btcRow = reloginHoldings.find((h) => h.id === btcId);
  const ethRow = reloginHoldings.find((h) => h.id === ethId);
  record(
    "BTC/EUR and ETH/USDC remain distinct",
    btcRow?.tradingPair === "BTC/EUR" &&
      ethRow?.tradingPair === "ETH/USDC" &&
      btcRow?.id !== ethRow?.id,
  );

  btc = { ...btc, quantity: 0.3, platform: "Bitvavo" };
  const editPut = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: `${saveKey}:edit-btc`,
      holdings: reloginHoldings.map((h) => (h.id === btcId ? btc : h)),
    }),
  });
  let editedHoldings =
    editPut.response.status === 200
      ? (editPut.json.snapshot?.holdings ?? [])
      : (await apiFetch("/api/portfolio", session, { method: "GET" })).json.snapshot
          ?.holdings ?? reloginHoldings;
  const editedBtc = editedHoldings.find((h) => h.id === btcId);
  const editedEth = editedHoldings.find((h) => h.id === ethId);
  record(
    "Edit only BTC/EUR",
    editPut.response.status === 200 &&
      editedBtc?.quantity === 0.3 &&
      editedBtc?.platform === "Bitvavo" &&
      editedEth?.quantity === 2.5 &&
      editedEth?.platform === "Kraken",
    `editStatus=${editPut.response.status}`,
  );

  const deletePut = await apiFetch("/api/portfolio", session, {
    method: "PUT",
    body: JSON.stringify({
      idempotencyKey: `${saveKey}:delete-eth`,
      holdings: editedHoldings.filter((h) => h.id !== ethId),
    }),
  });
  let finalHoldings =
    deletePut.response.status === 200
      ? (deletePut.json.snapshot?.holdings ?? [])
      : (await apiFetch("/api/portfolio", session, { method: "GET" })).json.snapshot
          ?.holdings ?? editedHoldings;
  record(
    "Delete only ETH/USDC; BTC and investments remain",
    deletePut.response.status === 200 &&
      !finalHoldings.some((h) => h.id === ethId) &&
      finalHoldings.some((h) => h.id === btcId) &&
      finalHoldings.some((h) => h.symbol === "VWCE") &&
      finalHoldings.some((h) => h.assetType === "cash"),
    `status=${deletePut.response.status} count=${finalHoldings.length}`,
  );

  const unpricedBtc = finalHoldings.find((h) => h.id === btcId);
  assert(unpricedBtc, "Expected BTC holding after delete flow");
  const display = resolveCryptoDisplayPrice(unpricedBtc);
  record(
    "Unpriced crypto shows Value unavailable semantics",
    display.price === null &&
      display.source === "unavailable" &&
      holdingValueUnavailableLabel(unpricedBtc) === "Value unavailable",
    `label=${holdingValueUnavailableLabel(unpricedBtc)}`,
  );

  record(
    "Purchase price is not used as market value",
    unpricedBtc.currentPrice === 0 &&
      display.price !== unpricedBtc.purchasePrice &&
      display.price == null,
    `purchase=${unpricedBtc.purchasePrice} display=${display.price}`,
  );

  const failed = results.filter((r) => !r.passed);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Smoke test failed:", error.message);
  process.exitCode = 1;
});
