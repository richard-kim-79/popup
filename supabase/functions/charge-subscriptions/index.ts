import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase Edge Function: charge-subscriptions
// Cron: "30 15 * * *" (UTC 15:30 = KST 00:30) — auto-lock 직후 실행
//
// 동작:
// 1. next_charge_at <= NOW() 이고 status='active' 이며 cancel_at_period_end=false 인 구독 조회
// 2. 토스 /v1/billing/{billingKey} 호출 → 결제
// 3. 성공: subscription_charges에 success 기록, current_period_start/end + next_charge_at 다음 주기로
// 4. 실패: failed_charge_count 증가, 3회 실패 → status='past_due'
// 5. cancel_at_period_end=true 인 구독 중 current_period_end < NOW() → status='canceled'

const TOSS_BASE = 'https://api.tosspayments.com/v1'
const PRICE: Record<string, Record<string, number>> = {
  lite: { monthly: 3900, yearly: 39000 },
  pro: { monthly: 9900, yearly: 99000 },
}

function authHeader(): string {
  // 자동결제는 별도 MID — TOSS_BILLING_SECRET_KEY 우선
  const key = Deno.env.get('TOSS_BILLING_SECRET_KEY') ?? Deno.env.get('TOSS_SECRET_KEY') ?? ''
  return 'Basic ' + btoa(`${key}:`)
}

function nextPeriodEnd(from: Date, cycle: string): Date {
  const d = new Date(from.getTime())
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date()
  const nowIso = now.toISOString()

  // ── (A) cancel_at_period_end + 주기 종료 → 'canceled' 처리 ───
  const { data: toCancel } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: nowIso })
    .eq('cancel_at_period_end', true)
    .in('status', ['active', 'past_due'])
    .lt('current_period_end', nowIso)
    .select('id')

  // ── (B) 청구 대상 조회 ──────────────────────────────────────
  const { data: due, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, tier, billing_cycle, billing_key, customer_key, current_period_end, failed_charge_count')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('next_charge_at', nowIso)

  if (error) {
    console.error('[charge-subscriptions] query error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: Array<{ id: string; status: 'success' | 'failed'; reason?: string }> = []

  for (const sub of due ?? []) {
    const amount = PRICE[sub.tier]?.[sub.billing_cycle] ?? 0
    if (amount <= 0) continue

    const orderId = `sub_${sub.id}_${Date.now()}`
    const orderName = `Popup ${sub.tier === 'pro' ? 'Pro' : 'Lite'} ${sub.billing_cycle === 'yearly' ? '연간' : '월간'} 구독`

    // 토스 청구 호출
    const res = await fetch(`${TOSS_BASE}/billing/${sub.billing_key}`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey: sub.customer_key,
        amount,
        orderId,
        orderName,
      }),
    })
    const json = await res.json().catch(() => ({}))

    if (res.ok) {
      // 성공 — 다음 주기로 갱신
      const newStart = new Date(sub.current_period_end)
      const newEnd = nextPeriodEnd(newStart, sub.billing_cycle)
      await supabase.from('subscription_charges').insert({
        subscription_id: sub.id,
        order_id: orderId,
        amount,
        status: 'success',
        payment_key: json.paymentKey,
      })
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: newStart.toISOString(),
          current_period_end: newEnd.toISOString(),
          next_charge_at: newEnd.toISOString(),
          failed_charge_count: 0,
        })
        .eq('id', sub.id)
      results.push({ id: sub.id, status: 'success' })
    } else {
      // 실패 — count 증가, 3회면 past_due
      const newFailed = (sub.failed_charge_count ?? 0) + 1
      await supabase.from('subscription_charges').insert({
        subscription_id: sub.id,
        order_id: orderId,
        amount,
        status: 'failed',
        error_code: json.code,
        error_message: json.message,
      })
      const update: { failed_charge_count: number; status?: 'past_due' } = {
        failed_charge_count: newFailed,
      }
      if (newFailed >= 3) update.status = 'past_due'
      await supabase.from('subscriptions').update(update).eq('id', sub.id)
      results.push({ id: sub.id, status: 'failed', reason: json.message })
    }
  }

  return new Response(
    JSON.stringify({
      charged: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      canceled: toCancel?.length ?? 0,
      details: results,
    }),
    { status: 200 },
  )
})
