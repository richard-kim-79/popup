// ============================================================
// API Key — 생성, 해시, 검증
// ============================================================

import { randomBytes, createHash } from 'crypto'

const PREFIX = 'lf_live_'
const KEY_BYTES = 24 // 32자 base64url

export type ApiKeyScope =
  | 'pages:create'
  | 'pages:read'
  | 'pages:update'
  | 'pages:delete'
  | 'uploads:create'

/** 모든 유효한 scope 목록 */
export const ALL_SCOPES: ApiKeyScope[] = [
  'pages:create',
  'pages:read',
  'pages:update',
  'pages:delete',
  'uploads:create',
]

/** scope 문자열 배열 유효성 검사 */
export function validateScopes(scopes: string[]): scopes is ApiKeyScope[] {
  return scopes.every((s) => (ALL_SCOPES as string[]).includes(s))
}

/**
 * 새 API 키 생성
 * @returns { raw, hash, prefix } — raw는 1회만 반환, hash는 DB에 저장
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(KEY_BYTES)
  const suffix = bytes.toString('base64url')
  const raw = `${PREFIX}${suffix}`
  const hash = hashApiKey(raw)
  const prefix = raw.slice(0, 16)
  return { raw, hash, prefix }
}

/** API 키 → SHA-256 해시 (비교용) */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** 해시 비교 (타이밍 공격 방지 — SHA-256 고엔트로피이므로 단순 비교도 안전하지만 방어적으로) */
export function verifyApiKeyHash(raw: string, storedHash: string): boolean {
  const inputHash = hashApiKey(raw)
  return inputHash === storedHash
}
