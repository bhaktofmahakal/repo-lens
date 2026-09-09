import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Code2,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userInitial = user.email ? user.email[0].toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121212]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#F04D26] to-[#ff6b47] shadow-md shadow-[#F04D26]/20">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white">RepoLens</span>
                <span className="text-[10px] uppercase tracking-widest text-[#F04D26]">Dev Studio</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-[#F04D26]" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/ask"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <MessageSquare className="h-3.5 w-3.5 text-white/50" />
                <span>Ask Repo</span>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <History className="h-3.5 w-3.5 text-white/50" />
                <span>History</span>
              </Link>
              <Link
                href="/dashboard/billing"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                <CreditCard className="h-3.5 w-3.5 text-white/50" />
                <span>Billing</span>
              </Link>
            </nav>
          </div>

          {/* User Account & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-white/5 text-xs font-bold text-white shadow-inner">
                {userInitial}
              </div>
              <div className="flex flex-col text-left">
                <span className="max-w-[160px] truncate text-xs font-medium text-white">{user.email}</span>
                <span className="text-[10px] text-emerald-400">● Workspace Active</span>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                title="Sign out of account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
