"use client";

import { CircleHelp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import {
  AMBIGUOUS_LISTING_BODY,
  AMBIGUOUS_LISTING_HEADING,
  HOLDING_IDENTIFIER_GLOSSARY_TRIGGER,
  HOLDING_IDENTIFIER_HELP,
  HOLDING_IDENTIFIER_TERMS,
  HOLDING_IDENTIFIER_WHERE_ANSWER,
  HOLDING_IDENTIFIER_WHERE_TITLE,
  type HoldingIdentifierTerm,
} from "@/lib/content/holdingIdentifierHelp";

const helpButtonClass =
  "inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

const panelClass =
  "mt-2 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] leading-relaxed text-slate-700";

function HelpPanel({
  id,
  labelledBy,
  children,
}: {
  id: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <div id={id} role="region" aria-labelledby={labelledBy} className={panelClass}>
      {children}
    </div>
  );
}

export function HoldingIdentifierLabel({
  term,
  children,
}: {
  term: HoldingIdentifierTerm;
  children: ReactNode;
}) {
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const copy = HOLDING_IDENTIFIER_HELP[term];

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-0.5">
        <span className="min-w-0">{children}</span>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`What ${copy.title} means`}
          onClick={() => setOpen((value) => !value)}
          className={helpButtonClass}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <HelpPanel id={panelId} labelledBy={buttonId}>
          <p className="font-semibold text-slate-900">{copy.title}</p>
          <p className="mt-1">{copy.summary}</p>
          {copy.extra ? <p className="mt-1">{copy.extra}</p> : null}
        </HelpPanel>
      ) : null}
    </div>
  );
}

export function HoldingIdentifierGlossaryDisclosure() {
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-[15px] font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {HOLDING_IDENTIFIER_GLOSSARY_TRIGGER}
      </button>
      {open ? (
        <HelpPanel id={panelId} labelledBy={buttonId}>
          <dl className="space-y-3">
            {HOLDING_IDENTIFIER_TERMS.map((term) => {
              const copy = HOLDING_IDENTIFIER_HELP[term];
              return (
                <div key={term}>
                  <dt className="font-semibold text-slate-900">{copy.title}</dt>
                  <dd className="mt-0.5">
                    <p>{copy.summary}</p>
                    {copy.extra ? <p className="mt-1">{copy.extra}</p> : null}
                  </dd>
                </div>
              );
            })}
            <div>
              <dt className="font-semibold text-slate-900">
                {HOLDING_IDENTIFIER_WHERE_TITLE}
              </dt>
              <dd className="mt-0.5">{HOLDING_IDENTIFIER_WHERE_ANSWER}</dd>
            </div>
          </dl>
        </HelpPanel>
      ) : null}
    </div>
  );
}

export function AmbiguousListingHelp({
  heading = AMBIGUOUS_LISTING_HEADING,
  title = AMBIGUOUS_LISTING_BODY,
}: {
  heading?: string;
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-semibold leading-relaxed text-slate-900">
        {heading}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{title}</p>
    </div>
  );
}
