/**
 * Live API verification against running dev server (localhost:3000).
 * Run: npx tsx scripts/e2e-live-api-verification.mjs
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const INSTRUMENTS = [
  { ticker: "STRC", exchange: "Euronext Amsterdam", providerSymbol: "STRC.AS" },
  { ticker: "AIFS", exchange: "Xetra", providerSymbol: "AIFS.XETRA" },
  { ticker: "NUKL", exchange: "Xetra", providerSymbol: "NUKL.XETRA" },
  { ticker: "VWCE", exchange: "Xetra", providerSymbol: "VWCE.XETRA" },
  { ticker: "IB1T", exchange: "Xetra", providerSymbol: "IB1T.XETRA" },
];

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log(`\n=== Live API E2E verification (${BASE}) ===\n`);
  let allPass = true;

  for (const instrument of INSTRUMENTS) {
    console.log(`--- ${instrument.ticker} ---`);

    const match = await postJson("/api/instruments/match", {
      holdings: [
        {
          ticker: instrument.ticker,
          exchange: instrument.exchange,
          assetType: "investment",
        },
      ],
    });

    const matched = match.data?.results?.[0]?.resolved;
    const matchPass = matched?.providerSymbol === instrument.providerSymbol;
    console.log(
      matchPass ? "PASS" : "FAIL",
      `Match: ${matched?.providerSymbol ?? "null"} (HTTP ${match.status})`,
    );
    if (!matchPass) allPass = false;

    const prices = await postJson("/api/prices", {
      holdings: [
        {
          symbol: instrument.ticker,
          providerSymbol: instrument.providerSymbol,
        },
      ],
      forceRefresh: false,
    });

    const quote = prices.data?.prices?.[0];
    const pricePass =
      prices.status === 200 &&
      prices.data?.success &&
      quote &&
      Number(quote.priceEur ?? quote.currentPrice) > 0;
    console.log(
      pricePass ? "PASS" : "FAIL",
      `Price: ${quote?.priceEur ?? quote?.currentPrice ?? "none"} (HTTP ${prices.status})`,
    );
    if (!pricePass) allPass = false;

    const noProvider = await postJson("/api/prices", {
      holdings: [{ symbol: "UNKNOWN", name: "Unknown" }],
    });
    const skipPass =
      noProvider.status === 200 &&
      (noProvider.data?.message?.includes("eligible") ||
        (noProvider.data?.prices?.length ?? 0) === 0);
    console.log(
      skipPass ? "PASS" : "FAIL",
      `Unresolved skip: HTTP ${noProvider.status}, success=${noProvider.data?.success}`,
    );
    if (!skipPass) allPass = false;
  }

  console.log(`\n=== Overall: ${allPass ? "ALL PASS" : "FAILURES"} ===\n`);
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
