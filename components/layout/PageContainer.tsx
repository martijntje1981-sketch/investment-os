import type { ReactNode } from "react";

import {
  appAnalysisPageCanvasClass,
  appDashboardPageCanvasClass,
  appDashboardPageStackClass,
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
  canvas = "default",
}: {
  children: ReactNode;
  className?: string;
  stackClassName?: string;
  canvas?: "default" | "dashboard" | "analysis";
}) {
  const canvasClass =
    canvas === "analysis"
      ? appAnalysisPageCanvasClass
      : canvas === "dashboard"
        ? appDashboardPageCanvasClass
        : appPageCanvasClass;
  const stackClass =
    canvas === "analysis" || canvas === "dashboard"
      ? appDashboardPageStackClass
      : appPageStackClass;

  return (
    <main
      className={cn(
        canvasClass,
        className,
      )}
    >
      <div
        className={cn(
          stackClass,
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
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
