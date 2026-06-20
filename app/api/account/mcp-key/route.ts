// ============================================================
// 개인 MCP 연결 키 — 로그인 사용자가 Claude(MCP) 연결용 개인 키 발급/조회/해제
// GET    : 연결 상태(연결됨 여부, prefix, 발급시각)
// POST   : 키 (재)발급 — 기존 활성 키 폐기 후 새로 발급, 전체 키·URL 1회 반환
// DELETE : 연결 해제 — 활성 키 폐기
// ============================================================

import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { generateApiKey } from '@/lib/api-key'

const MCP_KEY_NAME = 'MCP (Claude)'
const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()
const MCP_SCOPES = ['pages:create', 'pages:read', 'pages:update']

async function getUserId(): Promise<string | null> {
  const session = await getSupabaseServer()
  const { data } = await session.auth.getUser()
  return data?.user?.id ?? null
}

/** 연결 상태 */
export async function GET(): Promise<NextResponse> {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('api_keys')
    .select('prefix, created_at')
    .eq('user_id', userId)
    .eq('name', MCP_KEY_NAME)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    connected: !!data,
    prefix: data?.prefix ?? null,
    createdAt: data?.created_at ?? null,
  })
}

/** 키 (재)발급 */
export async function POST(): Promise<NextResponse> {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // 기존 활성 MCP 키 폐기 (회전)
  await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('name', MCP_KEY_NAME)
    .is('revoked_at', null)

  const { raw, hash, prefix } = generateApiKey()

  const { error } = await admin.from('api_keys').insert({
    key_hash:   hash,
    prefix,
    name:       MCP_KEY_NAME,
    scopes:     MCP_SCOPES,
    rate_limit: 120,
    user_id:    userId,
  })

  if (error) {
    return NextResponse.json({ error: '키 발급에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    key:    raw,
    prefix,
    mcpUrl: `${BASE}/api/mcp?key=${raw}`,
  })
}

/** 연결 해제 */
export async function DELETE(): Promise<NextResponse> {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const admin = getSupabaseAdmin()
  await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('name', MCP_KEY_NAME)
    .is('revoked_at', null)

  return NextResponse.json({ ok: true })
}
