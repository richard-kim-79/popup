// ============================================================
// 구독 상태 조회 + 라이프사이클 면제 헬퍼
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SubscriptionStatusValue, SubscriptionTier } from '@/types'

export interface ActiveSubscription {
  id: string
  tier: SubscriptionTier
  status: SubscriptionStatusValue
}

/**
 * 사용자가 라이프사이클 면제를 받는지 (유료 구독 active 또는 past_due 상태)
 *
 * past_due도 grace period로 면제 — 그 사이에 재결제 또는 해지 처리됨.
 */
export async function isLifecycleExempt(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('subscriptions')
    .select('status, tier')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .limit(1)
    .maybeSingle()

  return !!data && (data.tier === 'lite' || data.tier === 'pro')
}
