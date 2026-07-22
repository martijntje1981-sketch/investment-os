"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Newspaper, UserRound } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

const protectedRoutes = [
  "/dashboard",
  "/portfolio",
  "/upload",
  "/analysis",
  "/briefing",
  "/news",
  "/discover",
  "/goals",
  "/settings",
  "/holding",
];

export default function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isProtectedPage = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  useEffect(() => {
    if (!isProtectedPage) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setUser(session?.user ?? null);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isProtectedPage, supabase]);

  if (!isProtectedPage || !user) return null;

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Investor";
  const email = user.email ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IO";

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="fixed right-5 top-5 z-[60] sm:right-8">
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur transition hover:bg-slate-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-40 truncate text-sm font-black text-slate-950">
              {fullName}
            </span>
            <span className="block max-w-40 truncate text-xs text-slate-500">
              Signed in
            </span>
          </span>
        </summary>

        <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  {fullName}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
              </div>
            </div>
          </div>

          <nav className="border-b border-slate-100 px-2 py-2">
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/news"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Newspaper className="h-4 w-4" />
              News
            </Link>
          </nav>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </details>
    </div>
  );
}