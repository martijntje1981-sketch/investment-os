export type Holding = {
    id: string;
    name: string;
    symbol: string;
    quantity: number;
    currency: string;
  };
  
  export const holdings: Holding[] = [
    {
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC/USD",
      quantity: 1,
      currency: "USD",
    },
  ];