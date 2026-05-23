import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isFreeExtensionPeriod, PLAN_DAYS } from '@/lib/promo'
import type { ApiError } from '@/types'

interface FreeExtendBody {
  slug?: unknown
  plan?: unknown
  email?: unknown
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<{ ok: true; slug: string; extendedUntil: string } | ApiError>> {
  // ── 프로모 기간 가드 (서버측 강제) ────────────────────────────
  if (!isFreeExtensionPeriod()) {
    return NextResponse.json({ error: '무료 이벤트가 종료되었습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as FreeExtendBody | null
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  const plan = body?.plan === 'month' || body?.plan === 'year' ? body.plan : null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!slug) {
    return NextResponse.json({ error: 'slug가 필요합니다.' }, { status: 400 })
  }
  if (!plan) {
    return NextResponse.json({ error: '잘못된 플랜입니다.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ── 페이지 조회 ───────────────────────────────────────────────
  const { data: page } = await supabase
    .from('pages')
    .select('id, expires_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!page) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  // ── 수명 연장 계산 (confirm 로직과 동일) ─────────────────────
  const base = new Date(page.expires_at) > new Date()
    ? new Date(page.expires_at)
    : new Date()
  const extendedUntil = new Date(
    base.getTime() + PLAN_DAYS[plan] * 24 * 60 * 60 * 1000,
  ).toISOString()

  // ── 페이지 잠금 해제 + 만료일 갱신 ────────────────────────────
  const { error: updateErr } = await supabase
    .from('pages')
    .update({ expires_at: extendedUntil, locked: false })
    .eq('slug', slug)

  if (updateErr) {
    return NextResponse.json({ error: '페이지 업데이트에 실패했습니다.' }, { status: 500 })
  }

  // ── 결제 기록 (amount=0) ──────────────────────────────────────
  const orderId = `free_${slug}_${plan}_${Date.now()}`
  await supabase.from('payments').insert({
    page_id: page.id,
    user_id: null,
    order_id: orderId,
    payment_key: null,
    amount: 0,
    plan,
    status: 'done',
    extended_until: extendedUntil,
    paid_at: new Date().toISOString(),
    customer_email: email || null,
  })

  // ── 이메일-페이지 연결 저장 ───────────────────────────────────
  if (email) {
    await supabase.from('page_emails').upsert(
      { page_id: page.id, email },
      { onConflict: 'page_id,email' },
    )
  }

  // ── 무료 연장 확인 이메일 (fire-and-forget) ───────────────────
  if (email && process.env.RESEND_API_KEY) {
    const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim()
    const days = PLAN_DAYS[plan]
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Popup <onboarding@resend.dev>',
        to: email,
        subject: `Popup 페이지 ${days}일 연장 완료 (이벤트)`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;color:#1C1917;margin-bottom:8px">🎉 무료 연장이 완료되었습니다</h2>
            <p style="color:#8C857B;font-size:14px;margin-bottom:24px">
              Popup 페이지가 <strong style="color:#2E6B52">${days}일</strong> 연장되었어요.
              <br/>(이벤트 기간 무료 · 8월 23일까지)
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
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, slug, extendedUntil })
}
