"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X, Search, Activity, History, Zap } from "lucide-react";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#ingest", label: "Try it" },
  { href: "/status", label: "Status" },
  { href: "/history", label: "History" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/status": <Activity className="h-3.5 w-3.5" />,
  "/history": <History className="h-3.5 w-3.5" />,
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const pillVariants = {
    top: {
      maxWidth: "1400px",
      width: "80%",
      borderRadius: 0,
      backgroundColor: "rgba(21,21,21,0)",
      borderColor: "rgba(255,255,255,0)",
      paddingTop: 8,
      paddingBottom: 8,
    },
    scrolled: {
      maxWidth: "760px",
      width: "92%",
      borderRadius: 9999,
      backgroundColor: "rgba(22,22,22,0.88)",
      borderColor: "rgba(255,255,255,0.08)",
      paddingTop: 10,
      paddingBottom: 10,
    },
  };

  return (
    <>
      {/* Desktop / tablet header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4">
        <motion.div
          initial={false}
          animate={scrolled ? "scrolled" : "top"}
          variants={pillVariants}
          transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          style={{
            border: "1px solid",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          className="flex w-full items-center justify-between gap-4 px-5"
        >
          {/* Brand mark */}
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F04D26]/40 bg-[#F04D26]/10 transition-colors group-hover:border-[#F04D26]/70 group-hover:bg-[#F04D26]/20">
              <svg width="14" height="14" viewBox="0 0 22 22" aria-hidden="true">
                <circle cx="11" cy="10" r="5" fill="none" stroke="#F04D26" strokeWidth="1.8" />
                <line x1="15" y1="14" x2="19" y2="18" stroke="#F04D26" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              Repo<span className="text-[#F04D26]">Lens</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav
            className="hidden items-center gap-0.5 md:flex"
            onMouseLeave={() => setHoveredId(null)}
          >
            {NAV_LINKS.map((link) => {
              const isPage = link.href.startsWith("/");
              return (
                <motion.div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setHoveredId(link.href)}
                >
                  {hoveredId === link.href && (
                    <motion.span
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.07]"
                      initial={false}
                      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
                    />
                  )}
                  {isPage ? (
                    <Link
                      href={link.href}
                      className="relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {NAV_ICONS[link.href]}
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  )}
                </motion.div>
              );
            })}
          </nav>

          {/* Right side: CTA + hamburger. Fixed-size container prevents layout shift on session load. */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Link
                href="/login"
                className="rounded-full bg-[#F04D26] px-4 py-1.5 text-sm font-semibold text-white ring-0 transition-all hover:bg-[#de4723] hover:ring-2 hover:ring-[#F04D26]/30"
              >
                Sign In
              </Link>
            </div>
            {/* Hamburger (mobile) */}
            <motion.button
              onClick={() => setMobileOpen((v) => !v)}
              whileTap={reduce ? {} : { scale: 0.9 }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/20 hover:text-white md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="x"
                    initial={reduce ? { opacity: 1 } : { opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={reduce ? { opacity: 1 } : { opacity: 0, rotate: 45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="mobile-drawer"
              className="fixed left-4 right-4 top-20 z-50 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl md:hidden"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
              transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Inner border shell */}
              <div className="rounded-[14px] border border-white/[0.04] bg-[#111111] p-2">
                {NAV_LINKS.map((link, i) => {
                  const isPage = link.href.startsWith("/");
                  return (
                    <motion.div
                      key={link.href}
                      initial={reduce ? { opacity: 1 } : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={reduce ? { duration: 0 } : { delay: i * 0.055, duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {isPage ? (
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-[#F04D26]">
                            {NAV_ICONS[link.href] ?? <Zap className="h-3.5 w-3.5" />}
                          </span>
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-base text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-white/30">
                            <Search className="h-3.5 w-3.5" />
                          </span>
                          {link.label}
                        </a>
                      )}
                    </motion.div>
                  );
                })}

                {/* Mobile CTA */}
                <div className="mt-1.5 border-t border-white/[0.06] pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F04D26] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#de4723]"
                  >
                    <Zap className="h-4 w-4" />
                    Sign In &mdash; it&apos;s free
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer so content doesn't hide under the fixed bar (only at top when not scrolled) */}
      <div className="h-[64px]" aria-hidden="true" />
    </>
  );
}
