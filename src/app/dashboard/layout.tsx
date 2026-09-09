import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CohereNavbar } from "@/components/navigation/CohereNavbar";

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
    <div className="min-h-screen bg-[#0e0e11] text-white">
      <CohereNavbar userEmail={user.email ?? undefined} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

