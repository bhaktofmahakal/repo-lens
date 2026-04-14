import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-screen bg-[#151515] text-white">
      <header className="border-b border-white/10 bg-[#111111]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm text-white/60">Signed in as</p>
            <p className="font-medium text-white">{user.email}</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/billing"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Billing
            </Link>
            <Link
              href="/ask"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Ask
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg bg-[#F04D26] px-3 py-2 text-sm font-medium text-white hover:bg-[#de4723]"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
