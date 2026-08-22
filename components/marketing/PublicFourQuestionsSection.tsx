"use client";

import { useState } from "react";

import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";

/**
 * Public Four Questions promise — same labels/colors as authenticated product.
 * Interaction reveals one extra sentence; not a personal answer.
 */
export function PublicFourQuestionsSection() {
  const [openId, setOpenId] = useState<FourQuestionId | null>(null);

  return (
    <section
      id="four-questions"
      className="scroll-mt-24 border-b border-slate-200 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-q1-strong">
            Four questions
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
            Tobailey answers four questions about your money
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            The same language you will see after signup — promise on the public
            site, personal answers inside the product.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOUR_QUESTIONS.map((question) => {
            const isOpen = openId === question.id;
            return (
              <button
                key={question.id}
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenId((current) =>
                    current === question.id ? null : question.id,
                  )
                }
                className={`rounded-[24px] border p-5 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${question.visual.panel} ${question.visual.ring} ${question.visual.hover}`}
              >
                <p
                  className={`text-xs font-black uppercase tracking-[0.16em] ${question.visual.eyebrow}`}
                >
                  {question.numberLabel}
                </p>
                <h3
                  className={`mt-3 text-lg font-black tracking-[-0.03em] ${question.visual.number}`}
                >
                  {question.question.replace(/\?$/, "").toUpperCase()}?
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {question.publicPromise}
                </p>
                {isOpen ? (
                  <p className="mt-3 border-t border-slate-200/80 pt-3 text-sm leading-6 text-slate-700">
                    {question.publicDetail}
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    Tap for one more detail
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
