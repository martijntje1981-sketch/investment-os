/**
 * Staging integration checks for portfolio sync.
 * Run with environment variables (never commit secrets):
 *   STAGING_APP_URL=https://your-preview.vercel.app
 *   STAGING_SUPABASE_URL=https://dunjbemdjpuskuyndbei.supabase.co
 *   STAGING_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *
 * Usage: node scripts/staging-portfolio-sync.integration.mjs
 */

import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.STAGING_APP_URL;
const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const supabaseKey =
  process.env.STAGING_SUPABASE_ANON_KEY ??
  process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;

if (!appUrl || !supabaseUrl || !supabaseKey) {
  console.error(
    "Missing STAGING_APP_URL, STAGING_SUPABASE_URL, or staging Supabase client key",
  );
  process.exit(1);
}

const stamp = Date.now();
const emailA = process.env.STAGING_USER_A_EMAIL ?? "portfolio-sync-a@example.com";
const emailB = process.env.STAGING_USER_B_EMAIL ?? "portfolio-sync-b@example.com";
const passwordA = process.env.STAGING_USER_A_PASSWORD ?? "PortfolioSyncStaging!A1";
const passwordB = process.env.STAGING_USER_B_PASSWORD ?? "PortfolioSyncStaging!B2";

const holdingsA = [
  {
    id: "local-vwce-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 12,
    purchasePrice: 98.5,
    currentPrice: 105,
    currency: "EUR",
    assetType: "investment",
    isin: "IE00BK5BQT80",
    providerSymbol: "VWCE.XETRA",
  },
  {
    id: "local-cash-eur",
    symbol: "EUR",
    name: "EUR Cash",
    quantity: 1500,
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    assetType: "cash",
  },
];

const goalA = {
  targetValue: 250000,
  targetYear: 2038,
  monthlyContribution: 750,
  expectedAnnualReturn: 7,
  passiveIncomeTarget: 12000,
};

const mappingsA = [
  {
    id: crypto.randomUUID(),
    lookupKey: "isin:IE00BK5BQT80",
    isin: "IE00BK5BQT80",
    symbol: "VWCE",
    exchange: "XETRA",
    instrumentName: "Vanguard FTSE All-World",
    providerSymbol: "VWCE.XETRA",
    matchMethod: "isin",
    confirmedAt: new Date().toISOString(),
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createSession(emailPrefix) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const email = `${emailPrefix}-${stamp}@yandex.com`;
  const password = `PortfolioSync!${stamp}`;

  const signedUp = await supabase.auth.signUp({ email, password });
  if (signedUp.error) {
    throw new Error(
      `signUp failed for ${email}: ${signedUp.error.message} (${signedUp.error.status ?? "no-status"})`,
    );
  }

  if (signedUp.data.session) {
    return {
      supabase,
      session: signedUp.data.session,
      userId: signedUp.data.user.id,
      email,
    };
  }

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    throw new Error(
      `signIn failed for ${email}: ${signedIn.error?.message ?? "no session after signup"}`,
    );
  }

  return {
    supabase,
    session: signedIn.data.session,
    userId: signedIn.data.user.id,
    email,
  };
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
  const results = [];

  const record = (name, passed, detail = "") => {
    results.push({ name, passed, detail });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  try {
    const userA = await createSession("sync-a");
    const userB = await createSession("sync-b");

    const emptyGet = await apiFetch("/api/portfolio", userA.session, {
      method: "GET",
    });
    record(
      "Device A: empty remote before migration",
      emptyGet.response.status === 200 &&
        emptyGet.json.snapshot?.holdingCount === 0,
    );

    const idempotencyKey = `migrate:staging:${stamp}`;
    const migrate = await apiFetch("/api/portfolio/migrate", userA.session, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey,
        holdings: holdingsA,
        goal: goalA,
        importMappings: mappingsA,
        localFingerprint: `fp-${stamp}`,
      }),
    });
    record(
      "Device A: migration succeeds with verification",
      migrate.response.status === 200 &&
        migrate.json.success === true &&
        migrate.json.verified === true &&
        migrate.json.snapshot?.holdingCount === 2,
      `status=${migrate.response.status}`,
    );

    const readBack = await apiFetch("/api/portfolio", userA.session, {
      method: "GET",
    });
    const remoteHoldings = readBack.json.snapshot?.holdings ?? [];
    record(
      "Device A: read-back matches holdings",
      remoteHoldings.some((h) => h.symbol === "VWCE" && Number(h.quantity) === 12) &&
        remoteHoldings.some((h) => h.assetType === "cash" && Number(h.quantity) === 1500),
    );
    record(
      "Device A: goal and mappings persisted",
      readBack.json.snapshot?.goal?.targetValue === 250000 &&
        (readBack.json.snapshot?.importMappings?.length ?? 0) === 1,
    );

    const migrateReplay = await apiFetch("/api/portfolio/migrate", userA.session, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey,
        holdings: holdingsA,
        goal: goalA,
        importMappings: mappingsA,
        localFingerprint: `fp-${stamp}`,
      }),
    });
    const replayCount = migrateReplay.json.snapshot?.holdingCount ?? 0;
    record(
      "Device A: idempotent migration creates no duplicates",
      migrateReplay.response.status === 200 && replayCount === 2,
      `holdings=${replayCount}`,
    );

    const deviceBGet = await apiFetch("/api/portfolio", userA.session, {
      method: "GET",
    });
    record(
      "Device B: loads same remote portfolio",
      deviceBGet.json.snapshot?.holdingCount === 2 &&
        deviceBGet.json.snapshot?.holdings?.some((h) => h.symbol === "VWCE"),
    );

    const saveKey = `save:${stamp}`;
    const edited = holdingsA.map((h) =>
      h.symbol === "VWCE" ? { ...h, quantity: 15, purchasePrice: 99 } : h,
    );
    const syncPut = await apiFetch("/api/portfolio", userA.session, {
      method: "PUT",
      body: JSON.stringify({
        idempotencyKey: saveKey,
        holdings: edited,
        goal: goalA,
        importMappings: mappingsA,
      }),
    });
    record(
      "Device A: edit sync succeeds",
      syncPut.response.status === 200 &&
        syncPut.json.snapshot?.holdings?.find((h) => h.symbol === "VWCE")?.quantity === 15,
    );

    const deviceBAfterEdit = await apiFetch("/api/portfolio", userA.session, {
      method: "GET",
    });
    record(
      "Device B: sees edited quantity",
      deviceBAfterEdit.json.snapshot?.holdings?.find((h) => h.symbol === "VWCE")
        ?.quantity === 15,
    );

    const deleteOne = edited.filter((h) => h.assetType !== "cash");
    const syncDelete = await apiFetch("/api/portfolio", userA.session, {
      method: "PUT",
      body: JSON.stringify({
        idempotencyKey: `${saveKey}:delete`,
        holdings: deleteOne.filter((h) => h.symbol !== "VWCE"),
        goal: goalA,
        importMappings: mappingsA,
      }),
    });
    record(
      "Device A: delete sync succeeds",
      syncPut.response.status === 200 &&
        !syncDelete.json.snapshot?.holdings?.some((h) => h.symbol === "VWCE"),
    );

    const userBRemote = await apiFetch("/api/portfolio", userB.session, {
      method: "GET",
    });
    record(
      "RLS: user B cannot read user A portfolio",
      userBRemote.json.snapshot?.holdingCount === 0,
    );

    const conflict = await apiFetch("/api/portfolio/migrate", userA.session, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `migrate:conflict:${stamp}`,
        holdings: [
          {
            id: "other-holding",
            symbol: "IWDA",
            name: "iShares Core MSCI World",
            quantity: 5,
            purchasePrice: 80,
            currentPrice: 85,
            currency: "EUR",
            assetType: "investment",
          },
        ],
        localFingerprint: `different-${stamp}`,
      }),
    });
    record(
      "Conflict: second migration with different data rejected",
      conflict.response.status === 409 && conflict.json.code === "conflict",
      `status=${conflict.response.status}`,
    );

    await userA.supabase.auth.signOut();
    const afterLogout = await apiFetch("/api/portfolio", userA.session, {
      method: "GET",
    });
    record(
      "Unauthenticated GET rejected after logout",
      afterLogout.response.status === 401,
      `status=${afterLogout.response.status}`,
    );

    const relogin = await userA.supabase.auth.signInWithPassword({
      email: userA.email,
      password: `PortfolioSync!${stamp}`,
    });
    assert(relogin.data.session, "Re-login failed");
    const afterRelogin = await apiFetch("/api/portfolio", relogin.data.session, {
      method: "GET",
    });
    record(
      "Re-login preserves remote portfolio",
      (afterRelogin.json.snapshot?.holdingCount ?? 0) >= 1,
      `count=${afterRelogin.json.snapshot?.holdingCount ?? 0}`,
    );

    const unauth = await fetch(`${appUrl}/api/portfolio`, { method: "GET" });
    record("Unauthenticated GET returns 401", unauth.status === 401);
  } catch (error) {
    console.error("Integration run failed:", error);
    process.exitCode = 1;
  }

  const failed = results.filter((item) => !item.passed);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
