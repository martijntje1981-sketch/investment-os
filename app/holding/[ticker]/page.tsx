export default async function HoldingPage({
    params,
  }: {
    params: Promise<{ ticker: string }>;
  }) {
    const { ticker } = await params;
  
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-4xl font-bold uppercase">{ticker}</h1>
  
        <p className="mt-4 text-slate-600">
          Holding detail page
        </p>
      </main>
    );
  }