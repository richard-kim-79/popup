import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // www → apex 정규화(canonical redirect).
  // www와 apex가 둘 다 앱을 서빙하면, OAuth PKCE 검증자 쿠키가 www에 기록됐는데
  // 콜백은 apex(NEXT_PUBLIC_BASE_URL)에서 실행되어 "PKCE code verifier not found"가 발생.
  // 모든 트래픽을 apex 한 호스트로 모아 쿠키-콜백 호스트를 항상 일치시킨다.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.popup2026.com' }],
        destination: 'https://popup2026.com/:path*',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // API 라우트에 캐시 비활성화
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
