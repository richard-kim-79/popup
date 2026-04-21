// ============================================================
// Admin API Keys Management — 생성 / 목록 / 폐기
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateApiKey, validateScopes, ALL_SCOPES, type ApiKeyScope } from '@/lib/api-key'
import type { ApiError } from '@/types'

interface ApiKeyRow {
  id: string
  prefix: string
  name: string
  scopes: string[]
  rate_limit: number
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  expires_at: string | null
}

interface CreateKeyRequest {
  name?: string
  scopes?: string[]
  rateLimit?: number
  expiresInDays?: number | null
}

interface ApiKeyListItem {
  id: string
  prefix: string
  name: string
  scopes: string[]
  rateLimit: number
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
  expiresAt: string | null
}

interface CreateKeyResponse {
  id: string
  key: string       // 평문 키 — 1회만 반환
  prefix: string
  name: string
  scopes: ApiKeyScope[]
}

/** GET — API 키 목록 조회 */
export async function GET(): Promise<NextResponse<{ data: ApiKeyListItem[] } | ApiError>> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, prefix, name, scopes, rate_limit, created_at, last_used_at, revoked_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'API 키 목록 조회 실패' }, { status: 500 })
  }

  const items: ApiKeyListItem[] = (data ?? []).map((k) => ({
    id: k.id,
    prefix: k.prefix,
    name: k.name,
    scopes: k.scopes ?? [],
    rateLimit: k.rate_limit ?? 100,
    createdAt: k.created_at,
    lastUsedAt: k.last_used_at,
    revokedAt: k.revoked_at,
    expiresAt: k.expires_at,
  }))

  return NextResponse.json({ data: items })
}

/** POST — 새 API 키 생성 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateKeyResponse | ApiError>> {
  const body = (await req.json().catch(() => null)) as CreateKeyRequest | null

  const name = body?.name?.trim() || 'Unnamed'
  const scopes = body?.scopes ?? [...ALL_SCOPES]
  const rateLimit = body?.rateLimit ?? 100
  const expiresInDays = body?.expiresInDays ?? null

  // scope 유효성 검사
  if (!validateScopes(scopes)) {
    return NextResponse.json(
      { error: `유효하지 않은 scope. 사용 가능: ${ALL_SCOPES.join(', ')}` },
      { status: 400 },
    )
  }

  if (rateLimit < 1 || rateLimit > 10000) {
    return NextResponse.json({ error: 'rateLimit은 1~10000 사이여야 합니다' }, { status: 400 })
  }

  // 키 생성
  const { raw, hash, prefix } = generateApiKey()

  let expiresAt: string | null = null
  if (expiresInDays && expiresInDays > 0) {
    const d = new Date()
    d.setDate(d.getDate() + expiresInDays)
    expiresAt = d.toISOString()
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key_hash: hash,
      prefix,
      name,
      scopes,
      rate_limit: rateLimit,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'API 키 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    key: raw,           // 평문 — 이 응답에서만 반환
    prefix,
    name,
    scopes: scopes as ApiKeyScope[],
  }, { status: 201 })
}

/** DELETE — API 키 폐기 (soft delete via revoked_at) */
export async function DELETE(req: NextRequest): Promise<NextResponse<{ success: boolean } | ApiError>> {
  const { searchParams } = new URL(req.url)
  const keyId = searchParams.get('id')

  if (!keyId) {
    return NextResponse.json({ error: 'id 파라미터가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .is('revoked_at', null)

  if (error) {
    return NextResponse.json({ error: 'API 키 폐기 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
