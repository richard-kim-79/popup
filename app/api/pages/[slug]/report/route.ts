import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'
import type { ApiError, ReportReason } from '@/types'

type Params = { params: Promise<{ slug: string }> }

const VALID_REASONS: ReportReason[] = ['illegal', 'spam', 'adult', 'other']
const HIDE_THRESHOLD = 3

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ ok: true } | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null)
  const reason = body?.reason as ReportReason | undefined
  const detail = (body?.detail as string) ?? null

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: '신고 사유를 선택해주세요.' }, { status: 400 })
  }

  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = hashIp(ip)

  const supabase = getSupabaseAdmin()

  // 페이지 존재 확인
  const { data: page } = await supabase
    .from('pages')
    .select('id, report_count')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!page) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 중복 신고 방지 (같은 IP에서 같은 페이지)
  const { error: insertError } = await supabase
    .from('reports')
    .insert({ page_id: page.id, reason, detail, ip_hash: ipHash })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: '이미 신고한 페이지입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: '신고 처리에 실패했습니다.' }, { status: 500 })
  }

  // report_count 증가
  const newCount = (page.report_count ?? 0) + 1
  await supabase
    .from('pages')
    .update({ report_count: newCount })
    .eq('id', page.id)

  // 임계치 이상이면 자동 숨김 (soft delete)
  if (newCount >= HIDE_THRESHOLD) {
    await supabase
      .from('pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', page.id)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
