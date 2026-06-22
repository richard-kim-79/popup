import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getUserUsage, getUserTier } from '@/lib/subscription'
import type { Json } from '@/types'

type Params = { params: Promise<{ id: string }> }

const FAR_FUTURE = () => new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()

async function logAction(
  admin: ReturnType<typeof getSupabaseAdmin>,
  action: string, targetId: string, meta?: Record<string, unknown>,
) {
  await admin.from('admin_actions').insert({
    action, target_type: 'user', target_id: targetId, meta: (meta ?? null) as Json,
  })
}

// ── 사용자 상세 ─────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: authData } = await admin.auth.admin.getUserById(id)
  if (!authData?.user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })

  const [usage, tier] = await Promise.all([getUserUsage(admin, id), getUserTier(admin, id)])

  const { data: subs } = await admin
    .from('subscriptions').select('*').eq('user_id', id)
    .order('created_at', { ascending: false })

  const subIds = (subs ?? []).map((s) => s.id)
  const { data: charges } = subIds.length
    ? await admin.from('subscription_charges').select('*').in('subscription_id', subIds)
        .order('attempted_at', { ascending: false }).limit(20)
    : { data: [] }

  const { data: pages } = await admin
    .from('pages')
    .select('slug, created_at, expires_at, locked, listed, deleted_at, view_count, report_count, html_content')
    .eq('user_id', id).order('created_at', { ascending: false }).limit(200)

  const pageRows = (pages ?? []).map((p) => ({
    slug: p.slug, created_at: p.created_at, expires_at: p.expires_at,
    locked: p.locked, listed: p.listed, deleted_at: p.deleted_at,
    view_count: p.view_count, report_count: p.report_count, is_html: !!p.html_content,
  }))

  return NextResponse.json({
    user: {
      id: authData.user.id,
      email: authData.user.email ?? null,
      created_at: authData.user.created_at,
      last_sign_in_at: authData.user.last_sign_in_at ?? null,
      banned_until: (authData.user as { banned_until?: string }).banned_until ?? null,
    },
    tier,
    usage,
    subscription: (subs ?? [])[0] ?? null,
    charges: charges ?? [],
    pages: pageRows,
  })
}

// ── 계정 제어 ───────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  const body = await req.json().catch(() => null) as { action?: string; tier?: string; cycle?: string } | null
  const action = body?.action
  const admin = getSupabaseAdmin()

  if (action === 'ban' || action === 'unban') {
    const ban_duration = action === 'ban' ? '876000h' : 'none'
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration } as { ban_duration: string })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAction(admin, action, id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel_subscription') {
    const { error } = await admin.from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString(), cancel_at_period_end: true })
      .eq('user_id', id).in('status', ['active', 'past_due'])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAction(admin, 'cancel_subscription', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_tier') {
    const tier = body?.tier
    // 기존 활성/연체 구독 해지 (active 유니크 인덱스 충돌 방지)
    await admin.from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('user_id', id).in('status', ['active', 'past_due'])

    if (tier === 'lite' || tier === 'pro') {
      const now = new Date().toISOString()
      const { error } = await admin.from('subscriptions').insert({
        user_id: id, tier, billing_cycle: body?.cycle === 'yearly' ? 'yearly' : 'monthly',
        status: 'active', granted_by_admin: true,
        billing_key: null, customer_key: null,
        current_period_start: now, current_period_end: FAR_FUTURE(), next_charge_at: FAR_FUTURE(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (tier !== 'free') {
      return NextResponse.json({ error: '잘못된 티어입니다.' }, { status: 400 })
    }
    await logAction(admin, 'set_tier', id, { tier })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '잘못된 액션입니다.' }, { status: 400 })
}
