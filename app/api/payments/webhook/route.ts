import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// 토스페이먼츠 웹훅: 결제 상태 동기화
// 서명 검증: https://docs.tosspayments.com/guides/webhook
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('toss-payments-signature') ?? ''

  // HMAC-SHA256 서명 검증
  const expected = crypto
    .createHmac('sha256', process.env.TOSS_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64')

  if (signature !== expected) {
    console.error('[webhook] 서명 불일치')
    return NextResponse.json({ error: '서명 불일치' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const { eventType, data } = event

  if (eventType === 'PAYMENT_STATUS_CHANGED') {
    const { orderId, status } = data
    const supabase = getSupabaseAdmin()

    const mapped = status === 'DONE' ? 'done'
      : status === 'CANCELED' ? 'canceled'
      : status === 'ABORTED' ? 'failed'
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
