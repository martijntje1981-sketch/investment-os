"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Goal, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!ready) {
    return <AppPageLoading />;
  }

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Investor";
  const email = user?.email ?? "Not available";

  return (
    <>
      <PageContainer>
        <PageHero
          title="Settings"
          subtitle="Manage your account, preferences and portfolio configuration."
        />

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                Account
              </h2>
              <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                {fullName}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-500">{email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-slate-500">
            Portfolio configuration
          </h2>
          <nav className="divide-y divide-slate-100">
            <SettingsLink
              href="/portfolio"
              icon={<BriefcaseBusiness className="h-4 w-4" />}
              label="Manage holdings"
              detail="Edit investments, cash and live prices"
            />
            <SettingsLink
              href="/goals"
              icon={<Goal className="h-4 w-4" />}
              label="Financial goal"
              detail="Update target, contributions and return assumptions"
            />
            <SettingsLink
              href="/upload"
              icon={<ArrowRight className="h-4 w-4" />}
              label="Import portfolio"
              detail="Add holdings from a screenshot or spreadsheet"
            />
          </nav>
        </section>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function SettingsLink({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[64px] items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-slate-500">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">{label}</span>
          <span className="mt-0.5 block text-sm text-slate-500">{detail}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
