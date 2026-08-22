import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import {
  SUPPORTED_INSTRUMENTS_PATH,
  uploadSupportedInstrumentsCallout,
} from "@/lib/content/supportedInstrumentsContent";

export function SupportedInstrumentsCallout() {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black tracking-[-0.02em] text-slate-950">
            {uploadSupportedInstrumentsCallout.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {uploadSupportedInstrumentsCallout.body}
          </p>
          <Link
            href={SUPPORTED_INSTRUMENTS_PATH}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
          >
            {uploadSupportedInstrumentsCallout.linkLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
