import { ShieldCheck } from "lucide-react";

export function ImportTrustBanner() {
  return (
    <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-white/10 p-3">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-[-0.03em]">
            Private by design
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Investment OS never asks for your broker password. Uploads are read
            once to build your portfolio, then saved securely to your account.
          </p>
        </div>
      </div>
    </section>
  );
}
