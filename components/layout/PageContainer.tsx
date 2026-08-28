import type { ReactNode } from "react";

import {
  appAnalysisPageCanvasClass,
  appDashboardPageCanvasClass,
  appDashboardPageStackClass,
  appNewsPageCanvasClass,
  appPageCanvasClass,
  appPageStackClass,
  appPortfolioPageCanvasClass,
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
  canvas?: "default" | "dashboard" | "analysis" | "news" | "portfolio";
}) {
  const canvasClass =
    canvas === "news"
      ? appNewsPageCanvasClass
      : canvas === "analysis"
        ? appAnalysisPageCanvasClass
        : canvas === "portfolio"
          ? appPortfolioPageCanvasClass
          : canvas === "dashboard"
            ? appDashboardPageCanvasClass
            : appPageCanvasClass;
  const stackClass =
    canvas === "analysis" ||
    canvas === "dashboard" ||
    canvas === "news" ||
    canvas === "portfolio"
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

export function AppPageLoading({
  canvas = "default",
}: {
  canvas?: "default" | "dashboard" | "analysis" | "news" | "portfolio";
}) {
  const navy =
    canvas === "dashboard" ||
    canvas === "analysis" ||
    canvas === "news" ||
    canvas === "portfolio";

  return (
    <main
      className={`flex min-h-screen items-center justify-center ${
        navy ? "bg-navy-hero-deep" : "bg-background"
      }`}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
