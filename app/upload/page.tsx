"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import PageNavigation from "../../components/PageNavigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "ready" | "processing" | "complete" | "error"
  >("idle");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setStatus("error");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setStatus("ready");
  }

  async function handleAnalyze() {
    if (!file) {
      return;
    }

    setStatus("processing");

    // In de volgende stap koppelen we hier de AI-analyse aan.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setStatus("complete");
  }

  function handleReset() {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview(null);
    setStatus("idle");
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageNavigation />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Investment OS
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Import your portfolio
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Upload a screenshot from your broker. Investment OS will recognize
            the holdings and prepare your portfolio automatically.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {!preview ? (
            <label className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-950">
                Upload portfolio screenshot
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Use a clear screenshot showing the product names, quantities
                and current values.
              </p>

              <span className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                Select screenshot
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div>
              <div className="relative min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <Image
                  src={preview}
                  alt="Portfolio screenshot preview"
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={status === "processing"}
                  className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "processing"
                    ? "Analyzing portfolio..."
                    : "Analyze screenshot"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === "processing"}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Choose another image
                </button>
              </div>

              {status === "complete" && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-semibold text-emerald-900">
                    Screenshot uploaded successfully
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    The upload flow works. Next we connect the real AI holding
                    recognition.
                  </p>
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
              Upload a PNG, JPG or WebP image.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}