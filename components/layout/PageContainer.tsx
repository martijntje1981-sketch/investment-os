import type { ReactNode } from "react";

import {
  appPageCanvasClass,
  appPageStackClass,
} from "@/components/layout/appSurface";

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
    <main className={cn(appPageCanvasClass, className)}>
      <div className={cn(appPageStackClass, stackClassName)}>{children}</div>
    </main>
  );
}

export function AppPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
