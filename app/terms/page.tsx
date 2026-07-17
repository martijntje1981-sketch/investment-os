import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";

import MarketingHeader from "@/components/marketing/MarketingHeader";

const sections = [
  {
    title: "1. About these terms",
    text: "These Terms & Conditions govern access to and use of Investment OS. By creating an account or using the platform, you agree to these terms. If you do not agree, do not use the service.",
  },
  {
    title: "2. The service",
    text: "Investment OS is an independent portfolio-monitoring and decision-support platform. Features may include portfolio imports, market information, calculations, goal tracking, news summaries and AI-assisted insights. Features, availability and data coverage may change as the product develops.",
  },
  {
    title: "3. No financial advice",
    text: "Investment OS does not provide personalised investment, tax, legal or financial advice. Information and calculations are provided for general informational and monitoring purposes only. Nothing on the platform is a recommendation to buy, sell or hold any asset. You remain responsible for your decisions and should consult a qualified professional where appropriate.",
  },
  {
    title: "4. Market data and AI limitations",
    text: "Market data may be delayed, incomplete or unavailable. AI-generated extraction and summaries can contain errors. You must review imported holdings, prices, calculations and AI output before relying on them. Investment OS does not guarantee that information is accurate, complete, current or suitable for a particular purpose.",
  },
  {
    title: "5. Accounts and acceptable use",
    text: "You must provide accurate account information, protect your credentials and notify us of suspected unauthorised access. You may not misuse the service, bypass security, interfere with operation, upload unlawful or malicious content, scrape the platform, or use it in a way that infringes another person's rights.",
  },
  {
    title: "6. Your portfolio information",
    text: "You retain responsibility for and rights in the information you upload. You permit Investment OS and its service providers to process that information only as needed to operate, secure and improve the requested service. Do not upload broker passwords, identity documents or unnecessary sensitive information.",
  },
  {
    title: "7. Service availability and records",
    text: "The platform may occasionally contain errors or experience interruptions. Important financial records should always be retained independently; Investment OS must not be used as your only record of a portfolio.",
  },
  {
    title: "8. Subscriptions, trial and cancellation",
    text: "The price, billing interval, trial conditions, taxes and renewal terms are shown before checkout. Subscriptions renew automatically until cancelled. Cancellation stops future renewal but does not normally refund a period already started, except where applicable law requires otherwise.",
  },
  {
    title: "9. Intellectual property",
    text: "Investment OS and its software, design, branding and original content are protected by intellectual-property rights. These terms grant you a limited, personal, non-exclusive and non-transferable right to use the service for its intended purpose. Third-party data and content remain subject to their owners' rights and licence terms.",
  },
  {
    title: "10. Availability and changes",
    text: "We aim to provide a reliable service but do not promise uninterrupted availability. We may maintain, update, suspend or modify features for security, legal, technical or product reasons. Where appropriate, material changes affecting paid users will be communicated in advance.",
  },
  {
    title: "11. Liability",
    text: "To the fullest extent permitted by applicable law, Investment OS is not liable for investment losses, missed opportunities, decisions based on inaccurate or delayed information, third-party services, or indirect or consequential loss. Nothing in these terms excludes liability that cannot legally be excluded or limits mandatory consumer rights.",
  },
  {
    title: "12. Suspension and termination",
    text: "You may stop using the service at any time. We may suspend or terminate access where necessary to address misuse, security risks, non-payment, legal requirements or material breach of these terms. Where reasonably possible, we will provide notice and an opportunity to remedy the issue.",
  },
  {
    title: "13. Privacy",
    text: "Our Privacy Policy explains how personal information is handled. It forms part of the framework governing your use of Investment OS.",
  },
  {
    title: "14. Governing law and disputes",
    text: "These terms are governed by the laws of the Netherlands. Disputes are submitted to the competent courts in the Netherlands, unless mandatory consumer law provides otherwise. Mandatory consumer protections in your country of residence remain unaffected.",
  },
  {
    title: "15. Contact and changes",
    text: "Questions about these terms can be submitted through our contact form. We may update these terms as the service develops. The latest version and effective date will appear on this page.",
  },
];

export default function TermsPage() {
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
              <FileCheck2 className="h-6 w-6" />
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Legal
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              These terms explain the rules and responsibilities that apply when
              using Investment OS.
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
                  <p className="mt-3 leading-7 text-slate-600">{section.text}</p>

                  {section.title === "13. Privacy" && (
                    <Link
                      href="/privacy"
                      className="mt-3 inline-flex font-bold text-blue-700 underline"
                    >
                      Read our Privacy Policy
                    </Link>
                  )}

                  {section.title === "15. Contact and changes" && (
                    <Link
                      href="/contact"
                      className="mt-3 inline-flex font-bold text-blue-700 underline"
                    >
                      Contact Investment OS
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}