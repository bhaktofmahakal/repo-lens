"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type SectionShellProps = {
  id: string;
  badge: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionShell({ id, badge, title, subtitle, children }: SectionShellProps) {
  const reduce = useReducedMotion();

  return (
    <section id={id} className="relative bg-[#151515] py-16 md:py-24">
      <div className="mx-auto w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px]">
        <div className="mb-12 text-center">
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#F04D26]/40 bg-[#F04D26]/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#F04D26]"
          >
            {badge}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
            className="mt-4 font-serif text-3xl italic text-white/90 md:text-4xl"
          >
            {title}
          </motion.h2>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
              className="mx-auto mt-4 max-w-2xl text-base text-[#7d7d87]"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
