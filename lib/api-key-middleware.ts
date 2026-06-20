// ============================================================
// API Key Middleware — v1 라우트용 Bearer 토큰 인증
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey, type ApiKeyScope } from '@/lib/api-key'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limiter'

export interface AuthenticatedApiKey {
  id: string
  scopes: ApiKeyScope[]
  rateLimit: number
}

export interface ApiV1Error {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/** v1 API 에러 응답 생성 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<ApiV1Error> {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  )
}

/**
 * Bearer 토큰에서 API 키를 추출하고 검증
 * 성공 시 AuthenticatedApiKey 반환, 실패 시 에러 NextResponse 반환
 */
export async function authenticateApiKey(
  req: NextRequest,
  requiredScope?: ApiKeyScope,
): Promise<AuthenticatedApiKey | NextResponse<ApiV1Error>> {
  // 1. Authorization 헤더에서 토큰 추출
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header. Use: Bearer <api_key>', 401)
  }

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey.startsWith('lf_live_')) {
    return apiError('UNAUTHORIZED', 'Invalid API key format', 401)
  }

  // 2. SHA-256 해시로 DB 조회
  const keyHash = hashApiKey(rawKey)
  const supabase = getSupabaseAdmin()

  interface ApiKeyRow {
    id: string
    scopes: string[]
    rate_limit: number
    revoked_at: string | null
    expires_at: string | null
  }

  const { data: apiKey, error } = await (supabase
    .from('api_keys')
    .select('id, scopes, rate_limit, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .single() as unknown as Promise<{ data: ApiKeyRow | null; error: { message: string } | null }>)

  if (error || !apiKey) {
    return apiError('UNAUTHORIZED', 'Invalid API key', 401)
  }

  // 3. 폐기 여부 확인
  if (apiKey.revoked_at) {
    return apiError('KEY_REVOKED', 'This API key has been revoked', 401)
  }

  // 4. 만료 여부 확인
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return apiError('KEY_EXPIRED', 'This API key has expired', 401)
  }

  // 5. scope 검증
  const scopes = (apiKey.scopes ?? []) as ApiKeyScope[]
  if (requiredScope && !scopes.includes(requiredScope)) {
    return apiError(
      'INSUFFICIENT_SCOPE',
      `This API key lacks the required scope: ${requiredScope}`,
      403,
      { required: requiredScope, available: scopes },
    )
  }

  // 6. Rate limit 검증
  const rateLimit = apiKey.rate_limit ?? 100
  if (!checkRateLimit(apiKey.id, rateLimit)) {
    return apiError('RATE_LIMITED', 'Too many requests. Please retry later.', 429, {
      limitPerMinute: rateLimit,
    })
  }

  // 7. last_used_at 업데이트 (fire and forget)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)

  return {
    id: apiKey.id,
    scopes,
    rateLimit,
  }
}

/** 인증 결과가 에러 응답인지 확인 */
export function isApiError(
  result: AuthenticatedApiKey | NextResponse<ApiV1Error>,
): result is NextResponse<ApiV1Error> {
  return result instanceof NextResponse
}

/**
 * raw 키 → 발급자(user_id) + 키 id 해석 (MCP 인증용).
 * 유효하지 않거나(형식·폐기·만료) 사용자에 연결되지 않은 키면 null.
 * MCP는 페이지 귀속만 필요하므로 scope/rate limit은 보지 않는다.
 */
export async function resolveApiKeyUserId(
  rawKey: string | null | undefined,
): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!rawKey || !rawKey.startsWith('lf_live_')) return null

  const keyHash = hashApiKey(rawKey)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error || !data || !data.user_id) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { userId: data.user_id, apiKeyId: data.id }
}
