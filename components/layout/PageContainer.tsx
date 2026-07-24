import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-screen w-full max-w-full overflow-x-clip bg-[#F4F7FB] px-3.5 pb-28 pt-4 text-slate-950 sm:px-6 sm:pb-28 sm:pt-6",
        className,
      )}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 md:gap-5">
        {children}
      </div>
    </main>
  );
}

export function AppPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
