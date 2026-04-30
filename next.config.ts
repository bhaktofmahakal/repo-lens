import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const posthogSources = ["https://*.posthog.com", "https://*.i.posthog.com"];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles; framer-motion injects inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // unsafe-eval only in dev (webpack HMR); stripped from production
      `script-src 'self' 'unsafe-inline' https://vercel.live ${posthogSources.join(" ")}${isDev ? " 'unsafe-eval'" : ""}`,
      "img-src 'self' data: blob:",
      `connect-src 'self' https://vercel.live ${posthogSources.join(" ")}`,
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
