import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { ApiError } from '@/types'

const PLAN_DAYS: Record<string, number> = {
  month: 30,
  year: 365,
}

const PLAN_AMOUNTS: Record<string, number> = {
  month: 1000,
  year: 10000,
}

export async function GET(req: NextRequest): Promise<NextResponse<{ ok: true; slug: string } | ApiError>> {
  const { searchParams } = new URL(req.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId    = searchParams.get('orderId')
  const amount     = searchParams.get('amount')
  const email      = searchParams.get('email')?.trim().toLowerCase() ?? ''

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  // orderId 형식: {slug}_{plan}_{timestamp}  (e.g. UWPdqi_month_1712345678000)
  const parts = orderId.split('_')
  if (parts.length < 3) {
    return NextResponse.json({ error: '잘못된 주문 ID입니다.' }, { status: 400 })
  }
  const slug = parts[0]
  const plan = parts[1] as 'month' | 'year'

  if (!PLAN_DAYS[plan]) {
    return NextResponse.json({ error: '잘못된 플랜입니다.' }, { status: 400 })
  }

  if (parseInt(amount) !== PLAN_AMOUNTS[plan]) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ── 멱등성: 이미 처리된 orderId면 중복 처리 없이 성공 반환 ──────
  const { data: existing } = await supabase
    .from('payments')
    .select('status')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existing?.status === 'done') {
    return NextResponse.json({ ok: true, slug })
  }

  // ── 환경변수 검증 ────────────────────────────────────────────
  if (!process.env.TOSS_SECRET_KEY) {
    return NextResponse.json({ error: '결제 설정 오류입니다.' }, { status: 500 })
  }

  // ── 토스페이먼츠 서버 승인 ───────────────────────────────────
  const authHeader = 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount) }),
  })

  if (!tossRes.ok) {
    const errBody = await tossRes.json().catch(() => ({})) as { message?: string }
    return NextResponse.json(
      { error: errBody.message ?? '결제 승인에 실패했습니다.' },
      { status: 400 }
    )
  }

  // ── 페이지 조회 (id + expires_at 한 번에) ───────────────────
  const { data: page } = await supabase
    .from('pages')
    .select('id, expires_at')
    .eq('slug', slug)
    .single()

  if (!page) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // ── 수명 연장 계산 ───────────────────────────────────────────
  const base = new Date(page.expires_at) > new Date()
    ? new Date(page.expires_at)
    : new Date()
  const extended_until = new Date(
    base.getTime() + PLAN_DAYS[plan] * 24 * 60 * 60 * 1000
  ).toISOString()

  // ── 페이지 잠금 해제 + 수명 연장 ────────────────────────────
  const { error: updateErr } = await supabase
    .from('pages')
    .update({ expires_at: extended_until, locked: false })
    .eq('slug', slug)

  if (updateErr) {
    return NextResponse.json({ error: '페이지 업데이트에 실패했습니다.' }, { status: 500 })
  }

  // ── 결제 기록 저장 ───────────────────────────────────────────
  await supabase.from('payments').insert({
    page_id: page.id,
    user_id: null,
    order_id: orderId,
    payment_key: paymentKey,
    amount: parseInt(amount),
    plan,
    status: 'done',
    extended_until,
    paid_at: new Date().toISOString(),
    customer_email: email || null,
  })

  // ── 이메일-페이지 연결 저장 ──────────────────────────────────
  if (email) {
    await supabase.from('page_emails').upsert(
      { page_id: page.id, email },
      { onConflict: 'page_id,email' }
    )
  }

  // ── 결제 확인 이메일 전송 (fire-and-forget) ──────────────────
  if (email && process.env.RESEND_API_KEY) {
    const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Popup <noreply@popup.bluewhale2025.com>',
        to: email,
        subject: `결제 완료 · Popup 페이지 ${PLAN_DAYS[plan]}일 연장`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;color:#1C1917;margin-bottom:8px">🌿 결제가 완료되었습니다</h2>
            <p style="color:#8C857B;font-size:14px;margin-bottom:24px">
              Popup 페이지가 <strong style="color:#2E6B52">${PLAN_DAYS[plan]}일</strong> 연장되었습니다.
            </p>
            <a href="${BASE}/${slug}/edit"
              style="display:inline-block;background:#2E6B52;color:#fff;text-decoration:none;
                     padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
              내 페이지 편집하기
            </a>
            <hr style="margin:32px 0;border:none;border-top:1px solid #E4DDD3">
            <p style="color:#C9C3BB;font-size:12px">
              내 이메일로 등록된 모든 페이지:
              <a href="${BASE}/my-pages?email=${encodeURIComponent(email)}" style="color:#2E6B52">${BASE}/my-pages</a>
            </p>
          </div>
        `,
      }),
    }).catch(() => {}) // fire-and-forget
  }

  return NextResponse.json({ ok: true, slug })
}
