import {
  appDarkCardClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { NewsGlanceSynthesis } from "@/lib/services/newsGlance";

export function NewsSynthesisBlock({
  synthesis,
}: {
  synthesis: NonNullable<NewsGlanceSynthesis>;
}) {
  return (
    <section
      className={`${appDarkCardClass} min-w-0`}
      data-testid="news-synthesis"
      aria-labelledby="news-synthesis-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="news-synthesis-heading">
          {synthesis.kicker}
        </p>
        <p className={`mt-1.5 text-[15px] font-medium leading-snug text-white`}>
          {synthesis.text}
        </p>
      </div>
    </section>
  );
}
