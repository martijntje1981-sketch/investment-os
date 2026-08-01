import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageContainer({
  children,
  className,
  stackClassName,
}: {
  children: ReactNode;
  className?: string;
  stackClassName?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-screen w-full max-w-full overflow-x-clip bg-[#F3F5F9] px-4 pb-28 pt-[4.5rem] text-slate-950 sm:px-6 sm:pb-28 sm:pt-[5rem]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 md:gap-6",
          stackClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export function AppPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
