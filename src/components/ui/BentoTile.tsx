"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type BentoTileProps = {
  title: string;
  description: string;
  compact?: boolean;
  icon?: ReactNode;
  accent?: boolean;
  visual?: ReactNode;
  delay?: number;
};

export function BentoTile({ title, description, compact = false, icon, accent = false, visual, delay = 0 }: BentoTileProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.23, 1, 0.32, 1], delay }}
      whileHover={reduce ? undefined : { y: -2 }}
      className={[
        "bg-[#1a1a1a] p-[5px]",
        compact ? "rounded-[28px]" : "rounded-[36px]",
      ].join(" ")}
    >
      <div className={[
        "border border-white/8 p-[2px]",
        compact ? "rounded-[25px]" : "rounded-[33px]",
      ].join(" ")}>
        <div className={[
          "overflow-hidden border border-white/5 bg-[#111111]",
          compact ? "rounded-[22px]" : "rounded-[30px]",
        ].join(" ")}>
          {/* Visual region */}
          <div className={[
            "relative border-b border-white/8 flex items-center justify-center",
            compact ? "h-[160px]" : "h-[220px]",
            accent
              ? "bg-[radial-gradient(circle_at_30%_20%,rgba(240,77,38,0.22),transparent_60%)]"
              : "bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.03),transparent_55%)]",
          ].join(" ")}>
            {visual ?? (
              <svg viewBox="0 0 220 130" className="h-28 w-52 opacity-70" aria-hidden="true">
                <path d="M40 84 82 60l42 24-42 24z" fill="#111111" stroke="#FFFFFF" strokeDasharray="4 4" strokeWidth="0.8" />
                <path d="M96 56 138 32l42 24-42 24z" fill="#111111" stroke="#FFFFFF" strokeDasharray="4 4" strokeWidth="0.8" />
                <path d="M82 60v48M124 84v24M138 32v48" stroke="#FFFFFF" opacity="0.3" />
                <rect x="118" y="80" width="8" height="8" rx="2" fill="#F04D26" />
              </svg>
            )}
          </div>

          {/* Text region */}
          <div className="p-6">
            {icon && <div className="mb-3 text-[#F04D26]">{icon}</div>}
            <h3 className="text-lg font-semibold text-white md:text-xl">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#7d7d87]">{description}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
