"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Github, Search, Zap } from "lucide-react";
import { HeroIsoBlocks } from "@/components/ui/HeroIsoBlocks";
import { SectionSeparator } from "@/components/ui/SectionSeparator";
import { SectionShell } from "@/components/ui/SectionShell";
import { BentoTile } from "@/components/ui/BentoTile";
import { Navbar } from "@/components/ui/Navbar";

function EditorialLines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
      <div className="absolute inset-y-0 left-[max(0px,calc(50%-700px))] w-px bg-white/[0.025]" />
      <div className="absolute inset-y-0 right-[max(0px,calc(50%-700px))] w-px bg-white/[0.025]" />
    </div>
  );
}

function VectorSearchSvg() {
  return (
    <svg viewBox="0 0 260 150" className="h-28 w-full max-w-[280px] opacity-80" aria-hidden="true">
      {[0,1,2,3,4].map((i) => (
        <line key={i} x1={40 + i * 36} y1="30" x2={40 + i * 36} y2="120" stroke="#333" strokeWidth="1" />
      ))}
      <circle cx="112" cy="75" r="28" fill="none" stroke="#F04D26" strokeWidth="1.5" strokeDasharray="5 3" />
      <circle cx="112" cy="75" r="5" fill="#F04D26" />
      <line x1="134" y1="97" x2="155" y2="118" stroke="#F04D26" strokeWidth="2" strokeLinecap="round" />
      {[{cx:76,cy:55},{cx:148,cy:48},{cx:94,cy:100},{cx:130,cy:88},{cx:58,cy:90},{cx:170,cy:75}].map((p,i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="3.5" fill="#555" />
      ))}
    </svg>
  );
}

function CitationSvg() {
  return (
    <svg viewBox="0 0 260 150" className="h-28 w-full max-w-[280px] opacity-80" aria-hidden="true">
      <rect x="20" y="25" width="130" height="100" rx="8" fill="#1a1a1a" stroke="#333" />
      <rect x="32" y="38" width="70" height="5" rx="2" fill="#555" />
      <rect x="32" y="50" width="100" height="4" rx="2" fill="#444" />
      <rect x="32" y="62" width="85" height="4" rx="2" fill="#444" />
      <rect x="32" y="74" width="60" height="4" rx="2" fill="#444" />
      <rect x="32" y="86" width="100" height="5" rx="2" fill="#F04D26" opacity="0.7" />
      <rect x="32" y="98" width="78" height="4" rx="2" fill="#444" />
      <rect x="155" y="80" width="90" height="28" rx="6" fill="#222" stroke="#F04D26" strokeWidth="1" />
      <text x="166" y="98" fontSize="9" fill="#F04D26" fontFamily="monospace">L86-L92</text>
      <line x1="155" y1="91" x2="134" y2="89" stroke="#F04D26" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  );
}

function LLMSvg() {
  return (
    <svg viewBox="0 0 260 150" className="h-28 w-full max-w-[280px] opacity-80" aria-hidden="true">
      <rect x="90" y="40" width="80" height="70" rx="10" fill="#1a1a1a" stroke="#333" />
      <text x="130" y="82" fontSize="11" fill="#F04D26" textAnchor="middle" fontFamily="monospace">LLM</text>
      {[45,65,85].map((y,i) => (
        <g key={i}>
          <line x1="30" y1={y} x2="86" y2={y} stroke="#555" strokeWidth="1.2" />
          <rect x="0" y={y-7} width="28" height="14" rx="4" fill="#1a1a1a" stroke="#444" />
        </g>
      ))}
      <line x1="174" y1="75" x2="228" y2="75" stroke="#F04D26" strokeWidth="1.5" />
      <polygon points="224,71 234,75 224,79" fill="#F04D26" />
      <rect x="200" y="62" width="50" height="26" rx="5" fill="#1a1a1a" stroke="#F04D26" strokeWidth="0.8" />
      <text x="225" y="78" fontSize="8" fill="#F04D26" textAnchor="middle">Answer</text>
    </svg>
  );
}

function HowItWorks() {
  const reduce = useReducedMotion();
  const steps = [
    { n: "01", title: "Ingest", desc: "Upload a ZIP (≤25 MB) or paste a public GitHub URL. Repo Lens indexes text and code files, skipping binaries automatically." },
    { n: "02", title: "Embed", desc: "Files are chunked into 60-line windows, vectorized with all-mpnet-base-v2, and stored in Supabase pgvector." },
    { n: "03", title: "Ask", desc: "Type a natural-language question. The nearest chunks are retrieved and fed to Groq Llama 3.1 to generate a grounded answer." },
    { n: "04", title: "Verify", desc: "Every answer arrives with file-path and line-range citations you can click through to the original source." },
  ];
  return (
    <SectionShell id="how" badge="How it works" title="Four steps from repo to insight">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: i * 0.07 }}
            className="rounded-[20px] border border-white/[0.07] bg-[#1a1a1a] p-5"
          >
            <span className="font-mono text-3xl font-bold text-[#F04D26]/40">{step.n}</span>
            <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#7d7d87]">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

function TechStackStrip() {
  const reduce = useReducedMotion();
  const items = ["Next.js 15", "Supabase · pgvector", "Hugging Face", "Groq · Llama 3.1", "Tailwind CSS", "TypeScript"];
  return (
    <div className="overflow-hidden border-y border-white/[0.05] bg-[#111111] py-4">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={reduce ? {} : { x: ["0%", "-50%"] }}
        transition={reduce ? { duration: 0 } : { duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-sm font-medium text-[#7d7d87]">
            <span className="mr-3 text-[#F04D26]">◆</span>{item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const reduce = useReducedMotion();

  return (
    <main className="relative bg-[#151515] text-white">
      <EditorialLines />

      {/* Nav */}
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#151515] pb-14 pt-20 md:pt-28">
        <div
          className="pointer-events-none absolute inset-0" aria-hidden="true"
          style={{ background: "radial-gradient(ellipse 900px 500px at 55% 0%,rgba(240,77,38,0.09),transparent 70%)" }}
        />
        <div className="relative mx-auto grid w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center gap-10 md:grid-cols-2">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#F04D26]"
            >
              Codebase Intelligence
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
              className="font-serif text-5xl leading-[1.08] tracking-tight text-white md:text-6xl"
            >
              Ask your codebase.<br />
              <span className="italic text-white/55">Verify every answer.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.14 }}
              className="mt-6 max-w-lg text-base leading-7 text-[#7d7d87] md:text-lg"
            >
              Repo Lens ingests your repository, generates vector embeddings, and answers natural-language questions with exact file-path and line-range citations — no hallucinations.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: 0.22 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#F04D26] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#de4723]">
                <Search className="h-4 w-4" />Get Started Free
              </Link>
              <a href="#how" className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10">
                How it works
              </a>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, delay: 0.42 }}
              className="mt-8 flex flex-wrap gap-4 text-xs text-[#7d7d87]"
            >
              {["ZIP upload","GitHub ingest","pgvector search","LLM answers","Citation proof"].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F04D26]" />{label}
                </span>
              ))}
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.85, ease: [0.23, 1, 0.32, 1], delay: 0.25 }}
            className="flex justify-center"
          >
            <HeroIsoBlocks className="w-full max-w-[580px]" />
          </motion.div>
        </div>
      </section>

      {/* Tech strip */}
      <TechStackStrip />

      <SectionSeparator />

      <HowItWorks />

      <SectionSeparator compact />

      {/* Feature bento */}
      <SectionShell
        id="features"
        badge="Features"
        title="Everything you need to understand a codebase"
        subtitle="From ingestion to answer — every step is grounded, auditable, and precise."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.1fr]">
          <BentoTile
            title="Vector Similarity Search"
            description="Supabase pgvector stores 768-d embeddings for all chunks. Semantic nearest-neighbor retrieval finds relevant code even when exact keywords differ."
            accent visual={<VectorSearchSvg />} delay={0}
          />
          <div className="grid gap-4">
            <BentoTile
              title="Citation-Backed Answers"
              description="Every LLM answer comes with file path and line range references so you can inspect the source directly."
              compact visual={<CitationSvg />} delay={0.06}
            />
            <BentoTile
              title="Groq · Llama 3.1"
              description="Fast inference via Groq ensures answers arrive in under two seconds while staying grounded in retrieved evidence."
              compact visual={<LLMSvg />} delay={0.12}
            />
          </div>
          <BentoTile
            title="Refactor Suggestions"
            description="Generate grounded refactor ideas from retrieved snippets. Every suggestion links back to the exact file and line range that motivated it."
            visual={
              <svg viewBox="0 0 260 150" className="h-28 w-full max-w-[280px] opacity-80" aria-hidden="true">
                <rect x="20" y="20" width="220" height="110" rx="10" fill="#1a1a1a" stroke="#333" />
                <rect x="32" y="36" width="50" height="5" rx="2" fill="#F04D26" opacity="0.7" />
                <rect x="32" y="48" width="180" height="4" rx="2" fill="#444" />
                <rect x="32" y="60" width="140" height="4" rx="2" fill="#444" />
                <rect x="32" y="78" width="50" height="5" rx="2" fill="#F04D26" opacity="0.5" />
                <rect x="32" y="90" width="160" height="4" rx="2" fill="#444" />
                <rect x="32" y="102" width="120" height="4" rx="2" fill="#444" />
                <rect x="178" y="110" width="55" height="16" rx="5" fill="#F04D26" opacity="0.8" />
                <text x="205" y="122" fontSize="8" fill="#fff" textAnchor="middle">Suggest</text>
              </svg>
            }
            delay={0.18}
          />
        </div>
      </SectionShell>

      <SectionSeparator />

      {/* Footer CTA */}
      <section className="bg-[#151515] py-20">
        <div className="mx-auto w-[90%] max-w-[900px] rounded-[28px] border border-[#F04D26]/20 bg-[radial-gradient(ellipse_at_top,rgba(240,77,38,0.10),transparent_65%)] p-10 text-center">
          <h2 className="font-serif text-3xl italic text-white md:text-4xl">Curious about your codebase?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#7d7d87]">
            Sign up free and start asking your codebase in natural language — answers in seconds, citations included.
          </p>
          <Link href="/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#F04D26] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#de4723]">
            <Zap className="h-4 w-4" />Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-[#0e0e0e] pt-16 pb-0">
        {/* Brand center */}
        <div className="relative z-10 mx-auto w-[90%] max-w-[1200px] mb-12 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F04D26]/40 bg-[#F04D26]/10">
              <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
                <circle cx="11" cy="10" r="5" fill="none" stroke="#F04D26" strokeWidth="1.8" />
                <line x1="15" y1="14" x2="19" y2="18" stroke="#F04D26" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <h2 className="mb-5 text-2xl font-semibold text-white md:text-3xl">
            Built by{" "}
            <a href="https://github.com/bhaktofmahakal" target="_blank" rel="noopener noreferrer"
              className="text-white/50 transition-colors hover:text-[#F04D26]">
              @bhaktofmahakal
            </a>
          </h2>
          <div className="flex justify-center gap-3">
            <a href="https://github.com/bhaktofmahakal" target="_blank" rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-white/20 hover:text-white"
              aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href="https://x.com/Utsav_mishraa" target="_blank" rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-white/20 hover:text-white"
              aria-label="X / Twitter">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.734-8.865L1.5 2.25h6.952l4.258 5.626zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Orange node separator */}
        <div className="relative z-10 mx-auto flex w-[90%] max-w-[1200px] items-center">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#F04D26]" />
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#F04D26]" />
        </div>

        {/* 5-column link grid */}
        <div className="relative z-10 mx-auto w-[90%] max-w-[1200px] grid grid-cols-2 gap-0 md:grid-cols-5">
          {([
            { heading: "Product", links: [
              { label: "Ask AI", href: "/ask" },
              { label: "Ingest ZIP", href: "#ingest" },
              { label: "GitHub Ingest", href: "#ingest" },
              { label: "Q&A History", href: "/history" },
            ]},
            { heading: "Explore", links: [
              { label: "How it Works", href: "#how" },
              { label: "Features", href: "#features" },
              { label: "Try it Free", href: "#ingest" },
            ]},
            { heading: "Tools", links: [
              { label: "Vector Search", href: "#features" },
              { label: "Citation Engine", href: "#features" },
              { label: "Source Browser", href: "/source" },
              { label: "System Status", href: "/status" },
            ]},
            { heading: "Community", links: [
              { label: "GitHub Repo", href: "https://github.com/bhaktofmahakal/repo-lens", external: true },
              { label: "Report Issue", href: "https://github.com/bhaktofmahakal/repo-lens/issues", external: true },
              { label: "Twitter / X", href: "https://x.com/bhaktofmahakal", external: true },
            ]},
            { heading: "Legal", links: [
              { label: "Privacy Policy", href: "#" },
              { label: "Terms of Service", href: "#" },
              { label: "MIT License", href: "https://github.com/bhaktofmahakal/repo-lens/blob/main/LICENSE", external: true },
            ]},
          ] as const).map((col, ci) => (
            <div key={col.heading} className={`relative px-6 py-3 ${ci < 4 ? "md:border-r md:border-white/[0.06]" : ""}`}>
              <span className="absolute left-6 top-0 hidden h-2 w-2 -translate-y-1/2 rounded-sm bg-[#F04D26] md:block" />
              <h3 className="mb-4 mt-3 text-sm font-semibold text-white">{col.heading}</h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-white/35 transition-colors hover:text-white">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}
                        className="text-sm text-white/35 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <span className="absolute bottom-0 left-6 hidden h-2 w-2 translate-y-1/2 rounded-sm bg-[#F04D26] md:block" />
            </div>
          ))}
        </div>

        {/* Orange node separator bottom */}
        <div className="relative z-10 mx-auto mt-10 flex w-[90%] max-w-[1200px] items-center">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#F04D26]" />
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#F04D26]" />
        </div>

        {/* Copyright bar */}
        <div className="relative z-10 mx-auto flex w-[90%] max-w-[1200px] flex-wrap items-center justify-between gap-3 py-5 text-sm text-white/25">
          <span>© 2026 Repo Lens. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="transition-colors hover:text-white">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-white">Terms of Service</a>
          </div>
        </div>

        {/* Watermark wordmark */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden" aria-hidden="true">
          <span className="select-none whitespace-nowrap pb-0 text-[clamp(80px,18vw,200px)] font-black uppercase leading-none tracking-tighter text-white/[0.025]">
            REPO LENS
          </span>
        </div>
      </footer>
    </main>
  );
}
