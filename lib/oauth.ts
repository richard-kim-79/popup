// ============================================================
// MCP OAuth 2.1 — 공통 헬퍼 (해시·PKCE·토큰 생성·메타데이터)
// ============================================================

import { randomBytes, createHash } from 'crypto'

export const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim().replace(/\/$/, '')

/** 본 MCP 리소스의 canonical URI (RFC 8707 audience) */
export const MCP_RESOURCE = `${BASE}/api/mcp`

export const OAUTH_SCOPES = ['pages:create', 'pages:read', 'pages:update']

/** 토큰/코드 TTL */
export const CODE_TTL_SEC = 60                  // authorization code: 60초
export const ACCESS_TTL_SEC = 60 * 60           // access token: 1시간
export const REFRESH_TTL_SEC = 60 * 60 * 24 * 60 // refresh token: 60일

/** SHA-256 16진 해시 — 토큰/코드는 평문 저장 금지 */
export function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** 고엔트로피 랜덤 토큰 (base64url) */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** PKCE S256 검증: base64url(sha256(verifier)) === challenge */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false
  const computed = createHash('sha256').update(verifier).digest('base64url')
  return computed === challenge
}

/** RFC 9728 Protected Resource Metadata */
export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [BASE],
    bearer_methods_supported: ['header'],
    scopes_supported: OAUTH_SCOPES,
  }
}

/** RFC 8414 Authorization Server Metadata */
export function authorizationServerMetadata() {
  return {
    issuer: BASE,
    authorization_endpoint: `${BASE}/api/oauth/authorize`,
    token_endpoint: `${BASE}/api/oauth/token`,
    registration_endpoint: `${BASE}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: OAUTH_SCOPES,
  }
}

/** 401 챌린지 헤더 값 (RFC 9728 §5.1) */
export function wwwAuthenticate(): string {
  return `Bearer resource_metadata="${BASE}/.well-known/oauth-protected-resource"`
}
