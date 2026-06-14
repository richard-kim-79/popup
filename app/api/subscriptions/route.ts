import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { issueBillingKey, chargeBilling } from '@/lib/toss'
import { TIERS, priceFor, nextPeriodEnd, customerKeyFor, type Tier, type BillingCycle } from '@/lib/tiers'
import type { ApiError } from '@/types'

interface Body {
  authKey?: unknown
  customerKey?: unknown
  tier?: unknown
  billingCycle?: unknown
}

interface SuccessResponse {
  ok: true
  subscription: {
    id: string
    tier: string
    billing_cycle: string
    status: string
    current_period_end: string
    next_charge_at: string
    card_company: string | null
    card_number_masked: string | null
  }
}

/**
 * POST /api/subscriptions
 *
 * 브라우저에서 토스 SDK로 BillingAuth 완료 → authKey + customerKey 수신
 * → 서버에서 BillingKey 발급 → 구독 행 생성
 *
 * 흐름:
 *  1. 로그인 검증 (Supabase Auth)
 *  2. customerKey가 본인 user_id와 일치하는지 검증
 *  3. tier + billingCycle 검증
 *  4. 이미 active 구독이 있는지 확인 (UNIQUE 제약이 있지만 사전 체크로 친절한 에러)
 *  5. 토스 BillingKey 발급
 *  6. subscriptions 테이블에 INSERT (status='active', 즉시 첫 청구는 cron에 위임 — 또는 여기서 즉시 청구?)
 *
 *  → 즉시 첫 청구 정책: 사용자가 BillingKey 발급 직후 결제까지 끝내고 "구독 시작" 확인 받는 게 자연스러움
 *     따라서 INSERT 후 chargeBilling 즉시 실행. 실패 시 빌링키만 살리고 status='past_due'로 둠.
 */
export async function POST(req: NextRequest): Promise<NextResponse<SuccessResponse | ApiError>> {
  // 1. 로그인 검증
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 2. body 검증
  const body = await req.json().catch(() => null) as Body | null
  const authKey = typeof body?.authKey === 'string' ? body.authKey : ''
  const customerKey = typeof body?.customerKey === 'string' ? body.customerKey : ''
  const tier = (body?.tier === 'lite' || body?.tier === 'pro') ? body.tier as Tier : null
  const billingCycle = (body?.billingCycle === 'monthly' || body?.billingCycle === 'yearly') ? body.billingCycle as BillingCycle : null

  if (!authKey || !customerKey) {
    return NextResponse.json({ error: '결제 정보가 없습니다.' }, { status: 400 })
  }
  if (!tier || !billingCycle) {
    return NextResponse.json({ error: '플랜을 선택해주세요.' }, { status: 400 })
  }
  if (customerKey !== customerKeyFor(user.id)) {
    return NextResponse.json({ error: '결제 정보가 일치하지 않습니다.' }, { status: 403 })
  }

  // 3. 기존 active 구독 확인
  const admin = getSupabaseAdmin()
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, tier, billing_cycle')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 활성 구독이 있어요. 변경하려면 먼저 해지해주세요.' }, { status: 409 })
  }

  // 4. 토스 BillingKey 발급
  const billing = await issueBillingKey(authKey, customerKey)
  if (!billing.ok) {
    return NextResponse.json({ error: `결제 정보 등록에 실패했어요: ${billing.error.message}` }, { status: 400 })
  }

  // 5. subscription 행 INSERT
  const now = new Date()
  const periodEnd = nextPeriodEnd(now, billingCycle)

  const { data: inserted, error: insertErr } = await admin
    .from('subscriptions')
    .insert({
      user_id: user.id,
      tier,
      billing_cycle: billingCycle,
      status: 'active',
      billing_key: billing.data.billingKey,
      customer_key: customerKey,
      card_company: billing.data.cardCompany,
      card_number_masked: billing.data.cardNumber,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_charge_at: periodEnd.toISOString(),  // 다음 청구는 주기 종료 시점
    })
    .select('id, tier, billing_cycle, status, current_period_end, next_charge_at, card_company, card_number_masked')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json({ error: '구독 정보 저장에 실패했어요.' }, { status: 500 })
  }

  // 6. 즉시 첫 청구 — 가격이 0이면 스킵 (Free는 구독 X)
  const amount = priceFor(tier, billingCycle)
  if (amount > 0) {
    const orderId = `sub_${inserted.id}_${Date.now()}`
    const orderName = `Popup ${TIERS[tier].name} ${billingCycle === 'yearly' ? '연간' : '월간'} 구독`
    const charge = await chargeBilling({
      billingKey: billing.data.billingKey,
      customerKey,
      orderId,
      orderName,
      amount,
      customerEmail: user.email ?? undefined,
    })

    if (charge.ok) {
      await admin.from('subscription_charges').insert({
        subscription_id: inserted.id,
        order_id: orderId,
        amount,
        status: 'success',
        payment_key: charge.data.paymentKey,
      })
    } else {
      await admin.from('subscription_charges').insert({
        subscription_id: inserted.id,
        order_id: orderId,
        amount,
        status: 'failed',
        error_code: charge.error.code,
        error_message: charge.error.message,
      })
      // 첫 청구 실패 → 구독 상태 past_due로 (사용자에게 다시 시도 안내)
      await admin
        .from('subscriptions')
        .update({ status: 'past_due', failed_charge_count: 1 })
        .eq('id', inserted.id)
      return NextResponse.json(
        { error: `첫 결제가 실패했어요: ${charge.error.message}` },
        { status: 402 },
      )
    }
  }

  return NextResponse.json({
    ok: true,
    subscription: inserted,
  })
}

/**
 * GET /api/subscriptions
 *
 * 현재 사용자의 활성 구독 + 최근 청구 1건 조회
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, tier, billing_cycle, status, current_period_start, current_period_end, next_charge_at, cancel_at_period_end, canceled_at, card_company, card_number_masked, created_at')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ subscription: subscription ?? null })
}

/**
 * DELETE /api/subscriptions
 *
 * 구독 해지: 즉시 해지 X — 현재 주기 종료 시점에 해지 (cancel_at_period_end = true)
 * 그 시점에 cron이 status='canceled'로 전환.
 *
 * body: { immediate?: boolean } — true면 즉시 해지 (환불 정책 별도)
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { immediate?: unknown }
  const immediate = body.immediate === true

  const admin = getSupabaseAdmin()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) {
    return NextResponse.json({ error: '활성 구독이 없어요.' }, { status: 404 })
  }

  const update: { cancel_at_period_end: boolean; status?: 'canceled'; canceled_at?: string } = {
    cancel_at_period_end: true,
  }
  if (immediate) {
    update.status = 'canceled'
    update.canceled_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('subscriptions')
    .update(update)
    .eq('id', sub.id)

  if (error) {
    return NextResponse.json({ error: '해지 처리에 실패했어요.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, immediate })
}
