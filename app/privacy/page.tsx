import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import MarketingHeader from "@/components/marketing/MarketingHeader";

const sections = [
  {
    title: "1. Who we are",
    content: (
      <p>
        Investment OS is an independent portfolio monitoring and decision-support
        platform. For privacy questions or requests,
        please use our <Link href="/contact">contact form</Link>.
      </p>
    ),
  },
  {
    title: "2. Information we process",
    content: (
      <div className="space-y-3">
        <p>Depending on the features you use, we may process:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>account and contact information;</li>
          <li>portfolio holdings, quantities, purchase prices and currencies;</li>
          <li>uploaded screenshots, CSV files and Excel files;</li>
          <li>financial goals and contribution assumptions;</li>
          <li>technical, security and limited usage information;</li>
          <li>support messages and attachments you send us.</li>
        </ul>
        <p>
          We do not ask for broker login credentials and do not connect to broker
          accounts in the MVP.
        </p>
      </div>
    ),
  },
  {
    title: "3. Why we use this information",
    content: (
      <p>
        We use information to provide and secure the service, recognise and
        verify uploaded holdings, calculate portfolio insights, personalise
        briefings and goals, process subscriptions, provide support, prevent
        misuse and improve reliability.
      </p>
    ),
  },
  {
    title: "4. Legal grounds",
    content: (
      <p>
        Where applicable, we process information because it is necessary to
        provide the service you requested, because we have a legitimate interest
        in operating and securing the platform, because you have given consent,
        or because we must comply with a legal obligation.
      </p>
    ),
  },
  {
    title: "5. AI-assisted processing",
    content: (
      <p>
        Investment OS may use AI services to extract holdings from uploads and
        produce summaries. AI output can be inaccurate. Recognised information
        must be reviewed before it is saved or relied upon. Uploaded information
        is shared with service providers only as needed to perform the requested
        function.
      </p>
    ),
  },
  {
    title: "6. Service providers and international transfers",
    content: (
      <p>
        We may use carefully selected providers for hosting, authentication,
        market data, AI processing, analytics, email and payments. They may only
        process information for the agreed service. If information is transferred
        outside the European Economic Area, we use an appropriate legal transfer
        mechanism where required.
      </p>
    ),
  },
  {
    title: "7. Retention",
    content: (
      <p>
        We keep personal information only for as long as necessary for the purpose
        for which it was collected, to meet legal obligations, resolve disputes
        and protect the service. Retention periods may differ by data category.
        Account information will normally be deleted or anonymised after the
        account and any applicable legal retention period end.
      </p>
    ),
  },
  {
    title: "8. Security",
    content: (
      <p>
        We use reasonable technical and organisational safeguards designed to
        protect information. No online service can guarantee absolute security.
        Do not upload passwords, identity documents or information that is not
        needed to use Investment OS.
      </p>
    ),
  },
  {
    title: "9. Your privacy rights",
    content: (
      <p>
        Subject to applicable law, you may request access, correction, deletion,
        restriction, portability or objection to certain processing. You may also
        withdraw consent where processing relies on consent and lodge a complaint
        with your local data-protection authority. Use our contact form to submit
        a request; we may need to verify your identity first.
      </p>
    ),
  },
  {
    title: "10. Cookies and local storage",
    content: (
      <p>
        The MVP may use strictly necessary cookies or browser storage to maintain
        sessions, preferences and recent market information. Optional analytics
        or marketing technologies will only be introduced with the required
        notice and choices.
      </p>
    ),
  },
  {
    title: "11. Changes to this policy",
    content: (
      <p>
        We may update this policy as the product develops or legal requirements
        change. The latest version and effective date will always appear on this
        page. Material changes will be communicated where appropriate.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingHeader />

      <main className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Legal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              This policy explains how Investment OS handles personal information
              when you visit or use the platform.
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Effective 17 July 2026 · Last updated 17 July 2026
            </p>

            <div className="mt-10 space-y-9 border-t border-slate-200 pt-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-black tracking-tight">
                    {section.title}
                  </h2>
                  <div className="mt-3 leading-7 text-slate-600 [&_a]:font-bold [&_a]:text-blue-700 [&_a]:underline">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}