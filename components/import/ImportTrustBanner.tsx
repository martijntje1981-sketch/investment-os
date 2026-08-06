import { ShieldCheck } from "lucide-react";

import {
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkMutedClass,
} from "@/components/layout/appSurface";

export function ImportTrustBanner() {
  return (
    <section className={`mt-6 ${appDarkCardClass} ${appDarkCardPaddingClass}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-white/10 p-3">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-[-0.02em]">
            You review everything before import
          </h2>
          <p className={`mt-2 max-w-3xl ${appDashboardDarkMutedClass}`}>
            Upload a CSV or Excel broker export. Tobailey never asks for your
            broker password. Accepted formats: .csv, .xlsx, .xls.
          </p>
        </div>
      </div>
    </section>
  );
}
