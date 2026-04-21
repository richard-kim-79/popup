// ============================================================
// 공개 API 키 자가 발급 엔드포인트
// POST /api-key/generate  { email: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateApiKey, ALL_SCOPES } from '@/lib/api-key'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// IP당 하루 최대 3회 발급 (인메모리, 재시작 초기화)
const ipRateMap = new Map<string, { count: number; resetAt: number }>()

function checkIpRate(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + 86_400_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  // IP rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkIpRate(ip)) {
    return NextResponse.json({ error: 'IP당 하루 최대 3회까지 발급할 수 있습니다.' }, { status: 429 })
  }

  let email: string
  try {
    const body = await req.json() as { email?: unknown }
    email = (body.email as string)?.trim() ?? ''
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '유효한 이메일 주소를 입력해주세요.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // 이메일로 이미 발급된 활성 키 확인
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id, prefix')
    .eq('name', email)
    .is('revoked_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `이 이메일로 이미 발급된 키가 있습니다 (${existing.prefix}...). 분실 시 새 이메일로 발급하거나 문의해주세요.` },
      { status: 409 },
    )
  }

  // API 키 생성
  const { raw, hash, prefix } = generateApiKey()

  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1년 유효

  const { error } = await supabase.from('api_keys').insert({
    key_hash:   hash,
    prefix,
    name:       email,           // 이메일을 name으로 저장
    scopes:     ALL_SCOPES,
    rate_limit: 60,              // 분당 60회 (공개 키)
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: '키 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }

  return NextResponse.json({ key: raw, prefix, expiresAt: expiresAt.toISOString() })
}
