"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HeroIsoBlocks({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 760 440"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Background platform */}
      <rect x="40" y="310" width="680" height="80" rx="8" fill="#1B1B1B" stroke="#333333" strokeWidth="1" />

      {/* Left iso block – file chunks */}
      <g opacity="0.78" stroke="#555555" fill="#141414" strokeWidth="1">
        <path d="M130 250 220 198 310 250 220 302z" />
        <path d="M220 198v104" stroke="#444444" />
        <path d="M130 250v60l90 52v-60" />
        <path d="M310 250v60l-90 52" />
        {/* inner grid lines */}
        <line x1="155" y1="264" x2="220" y2="228" stroke="#FFFFFF" strokeOpacity="0.08" />
        <line x1="180" y1="277" x2="245" y2="241" stroke="#FFFFFF" strokeOpacity="0.08" />
      </g>

      {/* Center iso block – embeddings/vectors */}
      <g opacity="0.78" stroke="#555555" fill="#141414" strokeWidth="1">
        <path d="M290 208 380 156 470 208 380 260z" />
        <path d="M380 156v104" stroke="#444444" />
        <path d="M290 208v60l90 52v-60" />
        <path d="M470 208v60l-90 52" />
      </g>

      {/* Right iso block – answers/LLM */}
      <g opacity="0.78" stroke="#555555" fill="#141414" strokeWidth="1">
        <path d="M450 248 540 196 630 248 540 300z" />
        <path d="M540 196v104" stroke="#444444" />
        <path d="M450 248v60l90 52v-60" />
        <path d="M630 248v60l-90 52" />
      </g>

      {/* Dashed connector lines between blocks */}
      <path d="M220 302 380 260" stroke="#FFFFFF" strokeDasharray="6 6" opacity="0.45" />
      <path d="M380 260 540 300" stroke="#FFFFFF" strokeDasharray="6 6" opacity="0.45" />

      {/* Orange node anchors */}
      <rect x="214" y="296" width="12" height="12" rx="2" fill="#F04D26" />
      <rect x="374" y="254" width="12" height="12" rx="2" fill="#F04D26" />
      <rect x="534" y="294" width="12" height="12" rx="2" fill="#F04D26" />

      {/* Labels on blocks */}
      <text x="200" y="340" fontSize="9" fill="#888888" textAnchor="middle">Chunks</text>
      <text x="370" y="330" fontSize="9" fill="#888888" textAnchor="middle">Vectors</text>
      <text x="540" y="360" fontSize="9" fill="#888888" textAnchor="middle">Answers</text>

      {/* Floating accent cube */}
      <motion.g
        initial={{ y: 0 }}
        animate={reduce ? { y: 0 } : { y: [-4, 2, -4] }}
        transition={reduce ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M363 110h44l-10 28h-44z" fill="#F04D26" stroke="#FFFFFF" strokeWidth="0.7" />
        <path d="M407 110 420 118l-10 28-13-8z" fill="#CC3D18" stroke="#FFFFFF" strokeWidth="0.7" />
        <path d="M353 138h44l13 8h-44z" fill="#E04423" stroke="#FFFFFF" strokeWidth="0.7" />
        {/* Inner detail */}
        <line x1="375" y1="118" x2="380" y2="136" stroke="#FFFFFF" strokeOpacity="0.4" />
        <line x1="390" y1="114" x2="385" y2="132" stroke="#FFFFFF" strokeOpacity="0.4" />
      </motion.g>

      {/* Scan line on center block top face */}
      <motion.line
        x1="310" y1="210"
        x2="450" y2="210"
        stroke="#F04D26"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        strokeDasharray="4 4"
        initial={{ strokeDashoffset: 0 }}
        animate={reduce ? {} : { strokeDashoffset: [0, -40] }}
        transition={reduce ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}
