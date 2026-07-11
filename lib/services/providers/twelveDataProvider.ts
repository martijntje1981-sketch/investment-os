export type MarketQuote = {
    symbol: string;
    price: number;
    changePercent: number;
    currency: string;
    updatedAt: string;
  };
export async function getQuote(symbol: string): Promise<MarketQuote> {
    const apiKey = process.env.TWELVEDATA_API_KEY;
  
    if (!apiKey) {
      throw new Error("Twelve Data API-key ontbreekt.");
    }
  
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
        symbol
      )}&apikey=${apiKey}`,
      { cache: "no-store" }
    );
  
    if (!response.ok) {
      throw new Error(`Twelve Data gaf foutcode ${response.status}.`);
    }
  
    const data = await response.json();
  
    if (data.status === "error") {
      throw new Error(data.message ?? "Twelve Data kon de koers niet ophalen.");
    }
  
    return {
        symbol: data.symbol ?? symbol,
        price: Number(data.close),
        changePercent: Number(data.percent_change),
        currency: data.currency ?? "USD",
        updatedAt: new Date().toISOString(),
      };}