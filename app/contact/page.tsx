import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Bug,
  Building2,
  Lightbulb,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const contactOptions = [
  {
    icon: Bug,
    title: "Product support",
    description:
      "Report a technical problem, incorrect portfolio result or unexpected behaviour.",
  },
  {
    icon: Lightbulb,
    title: "Feature requests",
    description:
      "Share ideas that could make Investment OS more useful for private investors.",
  },
  {
    icon: Building2,
    title: "Business partnerships",
    description:
      "Discuss broker, bank, data-provider or commercial partnership opportunities.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black tracking-[-0.02em]">
                Investment OS
              </p>

              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Complete investment system
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute left-1/2 top-0 h-[440px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-200/40 via-violet-200/30 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
            <MessageSquareText className="h-7 w-7" />
          </div>

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Contact Investment OS
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-6xl">
            Let&apos;s talk
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Ask a question, report a problem or share an idea. Feedback from
            early users helps us build a stronger Investment OS.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-5">
            {contactOptions.map((option) => {
              const Icon = option.icon;

              return (
                <article
                  key={option.title}
                  className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="mt-5 text-xl font-black tracking-[-0.02em]">
                    {option.title}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {option.description}
                  </p>
                </article>
              );
            })}

            <article className="rounded-[26px] bg-slate-950 p-6 text-white shadow-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-xl font-black">
                Never share broker credentials
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                Investment OS support will never ask for your broker password,
                recovery codes or trading credentials.
              </p>
            </article>
          </aside>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
                Send a message
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                How can we help?
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Complete the form below. During the private beta, this form is
                visual only and will be connected to secure message delivery
                before public launch.
              </p>
            </div>

            <form
              action="mailto:hello@investmentos.app"
              method="post"
              encType="text/plain"
              className="mt-8 space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  id="name"
                  name="name"
                  label="Full name"
                  placeholder="Your full name"
                  type="text"
                />

                <FormField
                  id="email"
                  name="email"
                  label="Email address"
                  placeholder="you@example.com"
                  type="email"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="text-sm font-bold text-slate-800"
                >
                  Subject
                </label>

                <select
                  id="subject"
                  name="subject"
                  required
                  defaultValue=""
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  <option value="Product support">Product support</option>
                  <option value="Portfolio data issue">
                    Portfolio data issue
                  </option>
                  <option value="Feature request">Feature request</option>
                  <option value="Beta access">Beta access</option>
                  <option value="Business partnership">
                    Business partnership
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="text-sm font-bold text-slate-800"
                >
                  Message
                </label>

                <textarea
                  id="message"
                  name="message"
                  required
                  rows={7}
                  placeholder="Tell us how we can help..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-600">
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-950"
                />

                <span>
                  I understand that Investment OS does not provide personal
                  financial advice.
                </span>
              </label>

              <button
                type="submit"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Mail className="h-4 w-4" />
                Send message
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-7 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                <p className="text-sm leading-6 text-slate-600">
                  For commercial or partnership enquiries, include your
                  organisation and intended use of Investment OS in the
                  message.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} Investment OS. All rights reserved.
          </p>

          <nav className="flex flex-wrap gap-5 text-xs font-bold text-slate-600">
            <Link href="/faq">FAQ</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function FormField({
  id,
  name,
  label,
  placeholder,
  type,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type: "text" | "email";
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-slate-800">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
      />
    </div>
  );
}