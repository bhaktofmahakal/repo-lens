
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Github, Mail, Lock, ArrowRight, Search, ShieldCheck, Zap, GitBranch, Chrome } from "lucide-react";

const FEATURES = [
  { icon: <Search className="h-4 w-4" />, text: "Ask any codebase in natural language" },
  { icon: <ShieldCheck className="h-4 w-4" />, text: "Every answer backed by file citations" },
  { icon: <Zap className="h-4 w-4" />, text: "Groq-powered sub-second responses" },
  { icon: <GitBranch className="h-4 w-4" />, text: "ZIP upload or GitHub URL ingestion" },
];

function EditorialLines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
      <div className="absolute inset-y-0 left-[max(0px,calc(50%-700px))] w-px bg-white/[0.025]" />
      <div className="absolute inset-y-0 right-[max(0px,calc(50%-700px))] w-px bg-white/[0.025]" />
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? searchParams.get("next") ?? "/ask";
  const registered = searchParams.get("registered") === "1";
  const authConfigError = searchParams.get("error") === "auth_config";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authConfigError ? "Authentication is not configured on the server. Set NEXTAUTH_SECRET and redeploy." : null,
  );
  const [info] = useState<string | null>(registered ? "Account created! Please sign in." : null);
  const reduce = useReducedMotion();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result;
    try {
      result = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });
    } catch {
      setError("Authentication is not configured on the server. Set NEXTAUTH_SECRET and redeploy.");
      setLoading(false);
      return;
    }

    if (result?.error) {
      if (result.error.toLowerCase().includes("configuration")) {
        setError("Authentication is not configured on the server. Set NEXTAUTH_SECRET and redeploy.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen bg-[#151515] text-white">
      <EditorialLines />

      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[#0e0e0e] p-12 lg:flex lg:w-[44%]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 600px 500px at 0% 50%, rgba(240,77,38,0.10), transparent 70%)" }}
          aria-hidden="true"
        />
        <Link href="/" className="group relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#F04D26]/40 bg-[#F04D26]/10 transition-colors group-hover:border-[#F04D26]/70">
            <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="10" r="5" fill="none" stroke="#F04D26" strokeWidth="1.8" />
              <line x1="15" y1="14" x2="19" y2="18" stroke="#F04D26" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">Repo<span className="text-[#F04D26]">Lens</span></span>
        </Link>

        <div className="relative z-10 max-w-sm">
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#F04D26]"
          >
            Codebase Intelligence
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
            className="font-serif text-4xl leading-[1.1] tracking-tight text-white"
          >
            Ask your codebase.<br />
            <span className="italic text-white/50">Get honest answers.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.14 }}
            className="mt-4 text-sm leading-7 text-[#7d7d87]"
          >
            Semantic search over your entire repo with exact file + line citations — no hallucinations, ever.
          </motion.p>
          <motion.ul
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 0.28 }}
            className="mt-8 space-y-3"
          >
            {FEATURES.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.32 + i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center gap-3 text-sm text-white/55"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#F04D26]/20 bg-[#F04D26]/[0.08] text-[#F04D26]">
                  {f.icon}
                </span>
                {f.text}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#F04D26]" />
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs text-white/20">© 2026 Repo Lens</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="group mb-10 flex items-center gap-2 lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#F04D26]/40 bg-[#F04D26]/10">
            <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="10" r="5" fill="none" stroke="#F04D26" strokeWidth="1.8" />
              <line x1="15" y1="14" x2="19" y2="18" stroke="#F04D26" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-base font-semibold">Repo<span className="text-[#F04D26]">Lens</span></span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-[28px] border border-white/[0.07] bg-[#1a1a1a] p-[5px]">
            <div className="rounded-[24px] border border-white/[0.07] bg-[#1a1a1a] p-[2px]">
              <div className="rounded-[22px] border border-white/[0.04] bg-[#111111] p-8">

                <div className="mb-7">
                  <h1 className="text-xl font-semibold text-white">Welcome back</h1>
                  <p className="mt-1 text-sm text-[#7d7d87]">Sign in to your Repo Lens account</p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {!error && info && (
                  <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/[0.08] px-4 py-3 text-sm text-green-400">
                    {info}
                  </div>
                )}

                {/* OAuth — Coming Soon */}
                <div className="space-y-2.5">
                  <OAuthComingSoon icon={<Github className="h-4 w-4" />} label="Continue with GitHub" />
                  <OAuthComingSoon icon={<Chrome className="h-4 w-4" />} label="Continue with Google" />
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-xs text-white/25">or sign in with email</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <input
                        type="email" required autoComplete="email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-[10px] border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#F04D26]/50 focus:ring-1 focus:ring-[#F04D26]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <input
                        type="password" required autoComplete="current-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-[10px] border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#F04D26]/50 focus:ring-1 focus:ring-[#F04D26]/20"
                      />
                    </div>
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#F04D26] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#de4723] disabled:opacity-50"
                  >
                    {loading
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>
                    }
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-white/30">
                  Don&apos;t have an account?{" "}
                  <Link href="/sign-up" className="text-[#F04D26] hover:underline">Sign up free</Link>
                </p>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function OAuthComingSoon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative flex w-full cursor-not-allowed select-none items-center justify-center gap-2.5 rounded-[12px] border border-white/[0.06] bg-white/[0.02] py-2.5 text-sm font-medium text-white/30">
      {icon}
      {label}
      <span className="absolute right-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        Soon
      </span>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#151515]" />}>
      <SignInForm />
    </Suspense>
  );
}
