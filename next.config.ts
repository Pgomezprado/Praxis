import type { NextConfig } from "next";
import path from "path";

// Dominios de Supabase (variables de entorno; en build se sustituyen si están presentes)
// La CSP usa la variable de entorno en runtime via middleware cuando se necesite más dinamismo,
// pero aquí cubrimos los dominios fijos de producción.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://*.supabase.co'
const supabaseHost = (() => {
  try { return new URL(SUPABASE_URL).host } catch { return '*.supabase.co' }
})()

const cspDirectives = [
  // Sólo HTTPS en producción; en desarrollo permite localhost
  `default-src 'self'`,
  // Scripts: self + inline requerido por Next.js (nonces manejados por Next.js)
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  // Estilos: self + inline (Tailwind genera estilos inline) + Google Fonts
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  // Fuentes: self + Google Fonts CDN
  `font-src 'self' https://fonts.gstatic.com`,
  // Imágenes: self + data URIs (avatares generados) + Supabase Storage
  `img-src 'self' data: https://${supabaseHost}`,
  // Conexiones: self + Supabase + Anthropic API (solo server-side, pero CSP cubre fetch del browser)
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.anthropic.com https://api.resend.com`,
  // Frames: ninguno (X-Frame-Options: DENY ya lo cubre)
  `frame-src 'none'`,
  // Objetos: ninguno
  `object-src 'none'`,
  // Base URI: restringido a self
  `base-uri 'self'`,
  // Form action: solo self
  `form-action 'self'`,
  // Upgrade insecure requests en producción
  `upgrade-insecure-requests`,
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
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
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
