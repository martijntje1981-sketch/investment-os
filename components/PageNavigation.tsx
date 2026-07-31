"use client";

import { BackButton } from "@/components/layout/BackButton";

/** Legacy wrapper — prefer importing BackButton directly. */
export default function PageNavigation() {
  return (
    <div className="flex items-center gap-3">
      <BackButton
        className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      />
    </div>
  );
}
