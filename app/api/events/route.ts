import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeSource } from '@/lib/source'
import { logPageEvent } from '@/lib/events'

/**
 * POST /api/events — 공개 이벤트 비콘.
 * 'arrival'(ref 유입)만 허용. 'created'는 서버 내부(/api/pages)에서만 기록해 위변조 방지.
 * 항상 200으로 응답(측정 실패가 UX에 영향 주지 않도록).
 */
export async function POST(req: NextRequest): Promise<NextResponse<{ ok: boolean }>> {
  const body = await req.json().catch(() => null) as { type?: unknown; source?: unknown } | null

  if (body?.type !== 'arrival') {
    return NextResponse.json({ ok: false })
  }

  const source = normalizeSource(body.source)
  if (source) {
    logPageEvent(getSupabaseAdmin(), 'arrival', source)
  }

  return NextResponse.json({ ok: true })
}
