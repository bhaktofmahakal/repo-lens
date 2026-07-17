import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const posthogSources = ["https://*.posthog.com", "https://*.i.posthog.com"];
const vercelAnalyticsSources = ["https://va.vercel-scripts.com", "https://*.vercel-analytics.com"];
// Allow the browser to PUT directly to Supabase Storage (presigned upload).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

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
      `script-src 'self' 'unsafe-inline' https://vercel.live ${posthogSources.join(" ")} ${vercelAnalyticsSources.join(" ")}${isDev ? " 'unsafe-eval'" : ""}`,
      "img-src 'self' data: blob:",
      `connect-src 'self' https://vercel.live ${posthogSources.join(" ")} ${vercelAnalyticsSources.join(" ")}${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Raise body-size limit so large ZIP uploads (up to 50 MB) are not
      // rejected with a raw 413 before reaching the Route Handler.
      bodySizeLimit: "50mb",
    },
  },
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
