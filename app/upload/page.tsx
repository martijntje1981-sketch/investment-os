"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  Check,
  FileImage,
  FileSpreadsheet,
  LockKeyhole,
  PenLine,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please select a JPG, PNG or WEBP image.");
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      setStatusMessage("The selected image is larger than 10 MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStatusMessage("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget === event.target) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function removeFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setStatusMessage("");
    setIsProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function analysePortfolio() {
    if (!selectedFile) {
      setStatusMessage("Please upload a portfolio screenshot first.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("");

    await new Promise((resolve) => setTimeout(resolve, 1400));

    setIsProcessing(false);
    setStatusMessage(
      "Screenshot accepted. Automatic portfolio recognition is the next integration step."
    );
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1120px] px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-10 sm:px-8 sm:pt-14">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            <LockKeyhole className="h-4 w-4" />
            Secure portfolio setup
          </div>

          <h1 className="mt-5 max-w-[760px] text-[36px] font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-[48px]">
            Add your portfolio in less than a minute.
          </h1>

          <p className="mt-4 max-w-[700px] text-base leading-7 text-slate-600 sm:text-lg">
            Upload a screenshot from your broker. Investment OS will use it
            to identify your holdings before anything is added to your
            dashboard.
          </p>
        </section>

        <section className="mt-9 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-600">
                    Recommended
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                    Upload a screenshot
                  </h2>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  JPG · PNG · WEBP
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {!selectedFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openFilePicker();
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-6 py-12 text-center transition ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Upload className="h-8 w-8" />
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-slate-950">
                    Drop your portfolio screenshot here
                  </h3>

                  <p className="mt-2 max-w-[430px] text-sm leading-6 text-slate-500">
                    Or select an image from your computer. Screenshots from
                    DEGIRO, Saxo, IBKR and other brokers are supported in the
                    planned recognition flow.
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openFilePicker();
                    }}
                    className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Choose screenshot
                  </button>

                  <p className="mt-4 text-xs text-slate-400">
                    Maximum file size: 10 MB
                  </p>
                </div>
              ) : (
                <div>
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                          <FileImage className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {selectedFile.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeFile}
                        aria-label="Remove uploaded screenshot"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {previewUrl && (
                      <div className="flex min-h-[330px] items-center justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Uploaded portfolio screenshot preview"
                          className="max-h-[520px] w-auto max-w-full rounded-xl object-contain shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={analysePortfolio}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Analysing screenshot...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Analyse portfolio
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={isProcessing}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {statusMessage && (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    statusMessage.startsWith("Screenshot accepted")
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Other setup options
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">Upload CSV</h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Ideal for larger portfolios or exported transactions.
                      </p>

                      <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Coming soon
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <PenLine className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Add manually
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Add a ticker, quantity and purchase price yourself.
                      </p>

                      <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Coming soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h2 className="mt-5 text-xl font-bold">
                Your portfolio data stays yours.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Investment OS never asks for your broker password. You review
                detected holdings before they are added to your portfolio.
              </p>

              <div className="mt-5 space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  No broker login required
                </div>

                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Review before saving
                </div>

                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Delete or replace anytime
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}