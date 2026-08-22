"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import {
  buildMixerIntelligence,
  emitMixerEvent,
  EXAMPLE_MIXER_ALLOCATION,
  MIXER_CTA_HREF,
  MIXER_CTA_LABEL,
  MIXER_EVENTS,
  MIXER_SLEEVE_IDS,
  MIXER_SLEEVE_LABELS,
  setMixerSleeve,
  writeMixerAllocationToSession,
  type MixerAllocation,
  type MixerSleeveId,
} from "@/lib/services/portfolioMixer";

export function PublicPortfolioMixer() {
  const [allocation, setAllocation] = useState<MixerAllocation>(
    EXAMPLE_MIXER_ALLOCATION,
  );
  const interacted = useRef(false);
  const intelligence = useMemo(
    () => buildMixerIntelligence(allocation),
    [allocation],
  );

  useEffect(() => {
    emitMixerEvent(MIXER_EVENTS.viewed);
    emitMixerEvent(MIXER_EVENTS.resultViewed);
  }, []);

  function onSleeveChange(sleeve: MixerSleeveId, value: number) {
    const next = setMixerSleeve(allocation, sleeve, value);
    setAllocation(next);
    writeMixerAllocationToSession(next);
    if (!interacted.current) {
      interacted.current = true;
      emitMixerEvent(MIXER_EVENTS.firstInteraction, { sleeve });
    }
  }

  return (
    <section
      id="portfolio-mixer"
      data-analytics={MIXER_EVENTS.viewed}
      className="scroll-mt-24 border-b border-slate-200 bg-white px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-q1-strong">
            Portfolio Mixer
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-brand-navy sm:text-5xl">
            See how a mix behaves
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Move the sliders. Tobailey interprets the mix instantly — no
            account, no prices, no advice. Starting figures are an example
            only.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm sm:p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Example mix
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Six sleeves. Always 100%.
                </p>
              </div>
              <p className="text-right">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Total
                </span>
                <span className="text-2xl font-black tabular-nums text-brand-navy">
                  {intelligence.total}%
                </span>
              </p>
            </div>

            <ul className="mt-6 space-y-4">
              {MIXER_SLEEVE_IDS.map((sleeve) => (
                <MixerSlider
                  key={sleeve}
                  sleeve={sleeve}
                  value={allocation[sleeve]}
                  onChange={onSleeveChange}
                />
              ))}
            </ul>
          </div>

          <div
            data-analytics={MIXER_EVENTS.resultViewed}
            className="rounded-[28px] border border-brand/25 bg-white p-5 shadow-[0_12px_32px_-16px_rgba(11,31,58,0.14)] sm:p-7"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q1-strong">
              Your portfolio
            </p>
            <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-brand-navy">
              {intelligence.stance}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {intelligence.insights[0].body}
            </p>

            <div className="mt-5 space-y-3">
              {intelligence.insights.slice(1).map((insight) => (
                <article
                  key={insight.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {insight.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                    {insight.body}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {intelligence.disclaimer} Illustrative mix only — not a forecast.
            </p>

            <Link
              href={MIXER_CTA_HREF}
              data-analytics={MIXER_EVENTS.ctaClicked}
              onClick={() => emitMixerEvent(MIXER_EVENTS.ctaClicked)}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-navy shadow-sm transition hover:bg-brand-hover"
            >
              {MIXER_CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Continues into the existing 14-day Complete trial. Free after
              that, or Complete at €5.99/month. No card required to start.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Then the Four Questions
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The Mixer only knows this simplified mix. Inside Tobailey the same
            thinking connects to your actual holdings, prices, news, goal,
            scenarios and history — that is what the four questions answer.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FOUR_QUESTIONS.map((question) => (
              <li
                key={question.id}
                className={`rounded-2xl border px-3 py-2.5 ${question.visual.panel}`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.14em] ${question.visual.eyebrow}`}
                >
                  {question.numberLabel} · {question.shortNavLabel}
                </p>
                <p className="mt-1 text-sm font-bold text-brand-navy">
                  {question.question}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MixerSlider({
  sleeve,
  value,
  onChange,
}: {
  sleeve: MixerSleeveId;
  value: number;
  onChange: (sleeve: MixerSleeveId, value: number) => void;
}) {
  const labelId = `mixer-${sleeve}-label`;
  const fill = `linear-gradient(to right, var(--brand-primary) ${value}%, #e2e8f0 ${value}%)`;

  return (
    <li className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <label
          id={labelId}
          htmlFor={`mixer-${sleeve}`}
          className="text-sm font-bold text-brand-navy"
        >
          {MIXER_SLEEVE_LABELS[sleeve]}
        </label>
        <span className="text-sm font-black tabular-nums text-brand-navy">
          {value}%
        </span>
      </div>
      <input
        id={`mixer-${sleeve}`}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value} percent`}
        onChange={(event) => onChange(sleeve, Number(event.target.value))}
        className="mt-2 h-8 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-navy [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-navy"
        style={{
          // Track fill for WebKit; Firefox uses the track rules above.
          background: fill,
        }}
      />
    </li>
  );
}
