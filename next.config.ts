import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Next.js 15+ changed staleTimes.dynamic to 0 (always stale), which causes the router
    // prefetcher to continuously re-fetch any visible <Link> whose cache has expired.
    // Restore a 30-second TTL so sidebar links don't spam the server on every page.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Tree-shake barrel exports from heavy libs so only the icons/components actually
    // imported ship to the client. Cuts shared bundle by 30-50KB gzipped.
    optimizePackageImports: [
      '@phosphor-icons/react',
      '@dnd-kit/core',
      '@dnd-kit/utilities',
      'recharts',
      'date-fns',
    ],
  },
  async headers() {
    // Wave 4.1 — add HSTS + CSP + (legacy) X-XSS-Protection.
    // CSP allows 'unsafe-inline' on style-src because Tailwind 4 and some
    // server-rendered React inline critical styles; tighten this to nonces
    // in a follow-up (Wave 5 backlog). script-src stays strict: 'self'
    // + 'wasm-unsafe-eval' (needed by some analytics SDKs; remove when
    // we drop them). The `default-src 'none'` fallback closes every other
    // destination type by default.
    const csp = [
      "default-src 'none'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.anthropic.com https://api.openai.com wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Wave 4.1 — HSTS. includeSubDomains is safe because every
          // subdomain under *.vercel.app and the custom domain should be HTTPS only.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Wave 4.1 — CSP. Report-only first (observability before enforcement)
          // to avoid breaking any in-production inline script we haven't spotted.
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          // Wave 4.1 — legacy XSS filter for old browsers. Mostly cosmetic on
          // modern Chromium (they strip it); harmless to keep.
          { key: 'X-XSS-Protection', value: '0' },
        ],
      },
    ]
  },
};

export default nextConfig;
