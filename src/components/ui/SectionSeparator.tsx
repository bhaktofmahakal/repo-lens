"use client";

function NodeMark({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" aria-hidden="true" className="flex-shrink-0">
      <rect x="0.5" y="0.5" width="8" height="8" rx="2" fill="#F04D26" />
    </svg>
  );
}

export function SectionSeparator({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mx-auto flex w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center justify-center gap-3 py-4">
        <NodeMark />
        <div className="h-px w-20 bg-white/20 md:w-40" />
        <NodeMark />
        <div className="h-px w-20 bg-white/20 md:w-40" />
        <NodeMark />
      </div>
    );
  }

  return (
    <>
      {/* Desktop separator with logo anchor */}
      <div className="mx-auto hidden w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center justify-center gap-4 py-6 lg:flex">
        <NodeMark />
        <div className="h-px w-48 bg-white/20" />
        <NodeMark />
        {/* Repo Lens icon anchor */}
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="0.5" y="0.5" width="31" height="31" rx="6" fill="#111111" stroke="#F04D26" strokeWidth="1" />
          <circle cx="16" cy="14" r="5" fill="none" stroke="#F04D26" strokeWidth="1.5" />
          <line x1="19.5" y1="18" x2="24" y2="23" stroke="#F04D26" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="14" r="2" fill="#F04D26" opacity="0.6" />
        </svg>
        <NodeMark />
        <div className="h-px w-48 bg-white/20" />
        <NodeMark />
      </div>

      {/* Mobile fallback */}
      <div className="mx-auto flex w-[90%] items-center justify-center gap-3 py-3 lg:hidden">
        <NodeMark />
        <div className="h-px w-12 bg-white/20" />
        <NodeMark />
        <div className="h-px w-12 bg-white/20" />
        <NodeMark />
      </div>
    </>
  );
}
