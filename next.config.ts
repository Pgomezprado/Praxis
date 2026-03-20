import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === 'development'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://*.supabase.co'
const supabaseHost = (() => {
  try { return new URL(SUPABASE_URL).host } catch { return '*.supabase.co' }
})()

const cspDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data: https://${supabaseHost}`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.anthropic.com https://api.resend.com`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // Solo en producción: fuerza HTTPS en el browser
  ...(!isDev ? [`upgrade-insecure-requests`] : []),
].join('; ')

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // HSTS solo en producción — en dev hace que Safari bloquee localhost con HTTP
  ...(!isDev ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  }] : []),
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
