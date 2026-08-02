import { ShieldCheck } from "lucide-react";

import {
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMutedClass,
} from "@/components/layout/appSurface";

export function ImportTrustBanner() {
  return (
    <section className={`mt-7 ${appDarkCardClass} ${appDarkCardPaddingClass}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-white/10 p-3">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em]">
            Private by design
          </h2>
          <p className={`mt-2 max-w-3xl ${appDashboardDarkMutedClass}`}>
            Tobailey never asks for your broker password. Uploads are read once
            to build your portfolio, then saved securely to your account.
          </p>
        </div>
      </div>
    </section>
  );
}
