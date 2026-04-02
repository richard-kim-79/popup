import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// 토스페이먼츠 웹훅: 결제 상태 동기화
// 토스페이먼츠는 웹훅 시크릿을 제공하지 않으므로 orderId 기반으로 유효성 확인
export async function POST(req: NextRequest): Promise<NextResponse> {
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
