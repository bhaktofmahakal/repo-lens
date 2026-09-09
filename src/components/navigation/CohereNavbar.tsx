"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Check,
  ChevronDown,
  CreditCard,
  Database,
  FileCode,
  Github,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

type Source = {
  id: string;
  name: string;
  type: string;
  github_url: string | null;
  chunk_count?: number;
};

type CohereNavbarProps = {
  userEmail?: string;
};

function CohereNavbarFallback({ userEmail }: CohereNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0e0e11]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-white transition-opacity hover:opacity-85">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
              <Layers className="h-3.5 w-3.5 text-[#ff7759]" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-white">RepoLens</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function CohereNavbarInner({ userEmail }: CohereNavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSourceId = searchParams.get("sourceId");

  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSources() {
      try {
        setLoadingSources(true);
        const res = await fetch("/api/sources");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.sources) {
            setSources(data.sources);
          }
        }
      } catch (err) {
        console.error("Failed to load sources in navbar:", err);
      } finally {
        if (isMounted) setLoadingSources(false);
      }
    }
    loadSources();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const activeSource = sources.find((s) => s.id === currentSourceId);

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  const handleSelectSource = (source: Source) => {
    setRepoDropdownOpen(false);
    if (pathname.startsWith("/history")) {
      router.push(`/history?sourceId=${source.id}`);
    } else {
      router.push(`/ask?sourceId=${source.id}`);
    }
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: currentSourceId ? `/ask?sourceId=${currentSourceId}` : "/ask",
      label: "Ask Repo",
      icon: MessageSquare,
      active: pathname === "/ask",
    },
    {
      href: currentSourceId ? `/history?sourceId=${currentSourceId}` : "/history",
      label: "History",
      icon: History,
      active: pathname === "/history",
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: CreditCard,
      active: pathname.startsWith("/dashboard/billing"),
    },
    {
      href: "/status",
      label: "Health",
      icon: Activity,
      active: pathname === "/status",
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0e0e11]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left Section: Brand & Repo Selector */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17171c] border border-white/15 text-white shadow-sm">
              <Layers className="h-4 w-4 text-[#ff7759]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white font-mono">
                RepoLens
              </span>
              <span className="cohere-mono-label text-[9px] -mt-0.5">
                AI INTELLIGENCE
              </span>
            </div>
          </Link>

          {/* Repo Selector Dropdown */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-[#17171c] px-3.5 py-1.5 text-xs text-white transition-all hover:border-white/20 hover:bg-[#202026]"
            >
              <Database className="h-3.5 w-3.5 text-[#ff7759]" />
              <span className="max-w-[130px] truncate font-mono text-[11px] font-medium text-white/90">
                {activeSource ? activeSource.name : sources.length > 0 ? "Select Repo" : "No Repos"}
              </span>
              {activeSource?.chunk_count !== undefined && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-white/60">
                  {activeSource.chunk_count}c
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-white/40" />
            </button>

            {repoDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setRepoDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#17171c] p-2 shadow-2xl backdrop-blur-xl">
                  <div className="mb-2 px-2 pt-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
                      <input
                        type="text"
                        placeholder="Search repositories..."
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-white/25 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {filteredSources.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-white/50">
                        {loadingSources ? "Loading repositories..." : "No indexed repositories found"}
                      </div>
                    ) : (
                      filteredSources.map((source) => {
                        const isSelected = source.id === currentSourceId;
                        return (
                          <button
                            key={source.id}
                            type="button"
                            onClick={() => handleSelectSource(source)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-white/10 text-white font-medium"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              {source.type === "github" ? (
                                <Github className="h-3.5 w-3.5 shrink-0 text-white/60" />
                              ) : (
                                <FileCode className="h-3.5 w-3.5 shrink-0 text-white/60" />
                              )}
                              <span className="truncate font-mono text-[11px]">{source.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {source.chunk_count !== undefined && (
                                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                                  {source.chunk_count}
                                </span>
                              )}
                              {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-2 border-t border-white/10 pt-2 px-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setRepoDropdownOpen(false)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center text-[11px] font-medium text-white/80 hover:bg-white/10"
                    >
                      <span>Manage All Repositories</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Cohere Pill Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  item.active
                    ? "bg-white text-[#17171c] font-semibold shadow-sm"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.active ? "text-[#17171c]" : "text-white/50"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: User Status & Sign Out */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <div className="hidden lg:flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="max-w-[140px] truncate text-xs text-white/60 font-mono">
                {userEmail}
              </span>
            </div>
          )}

          <form action={signOutAction} className="hidden sm:block">
            <button
              type="submit"
              className="btn-cohere-outline !py-1.5 text-xs"
              title="Sign out of account"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign Out</span>
            </button>
          </form>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#17171c] text-white/80"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#121216] px-4 py-4 md:hidden space-y-3">
          {/* Mobile Repo Selector */}
          {sources.length > 0 && (
            <div className="space-y-1 pb-2 border-b border-white/10">
              <span className="cohere-mono-label text-[10px]">CURRENT REPOSITORY</span>
              <div className="grid grid-cols-1 gap-1 pt-1">
                {sources.slice(0, 4).map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => {
                      handleSelectSource(source);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-mono ${
                      source.id === currentSourceId
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{source.name}</span>
                    {source.chunk_count !== undefined && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                        {source.chunk_count}c
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium ${
                    item.active
                      ? "bg-white text-[#17171c] font-semibold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            {userEmail && (
              <span className="text-xs text-white/50 truncate max-w-[200px] font-mono">
                {userEmail}
              </span>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="btn-cohere-outline !py-1 text-xs text-red-300 border-red-500/30"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

export function CohereNavbar(props: CohereNavbarProps) {
  return (
    <Suspense fallback={<CohereNavbarFallback {...props} />}>
      <CohereNavbarInner {...props} />
    </Suspense>
  );
}

