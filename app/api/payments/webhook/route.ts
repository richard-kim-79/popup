import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// 토스페이먼츠 웹훅: 결제 상태 동기화
// Authorization 헤더: Basic {Base64(webhookSecret + ":")}
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 웹훅 서명 검증 ──────────────────────────────────────────
  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: '웹훅 설정 오류입니다.' }, { status: 500 })
  }

  const expectedAuth = 'Basic ' + Buffer.from(webhookSecret + ':').toString('base64')
  const authHeader = req.headers.get('authorization')
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: '인증 실패.' }, { status: 401 })
  }

  let body: { eventType?: string; data?: { orderId?: string; status?: string } }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { eventType, data } = body

  if (eventType === 'PAYMENT_STATUS_CHANGED' && data?.orderId && data?.status) {
    const { orderId, status } = data
    const supabase = getSupabaseAdmin()

    // orderId가 DB에 존재하는지 확인 (유효성 검증)
    const { data: payment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (!payment) {
      return NextResponse.json({ ok: true }) // 알 수 없는 주문 — 무시
    }

    const mapped = status === 'DONE'     ? 'done'
      : status === 'CANCELED' ? 'canceled'
      : status === 'ABORTED'  ? 'failed'
      : null

    if (mapped) {
      await supabase
        .from('payments')
        .update({ status: mapped })
        .eq('order_id', orderId)
    }
  }

  return NextResponse.json({ ok: true })
}
