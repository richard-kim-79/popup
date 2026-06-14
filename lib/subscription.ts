// ============================================================
// 구독 상태 조회 + 사용량 + 라이프사이클 면제 헬퍼
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SubscriptionStatusValue, SubscriptionTier } from '@/types'
import type { Tier } from '@/lib/tiers'

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

/**
 * 사용자의 현재 티어 — active/past_due 구독이 있으면 그 tier, 없으면 'free'
 */
export async function getUserTier(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<Tier> {
  const { data } = await admin
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .limit(1)
    .maybeSingle()

  if (data?.tier === 'lite' || data?.tier === 'pro') return data.tier
  return 'free'
}

export interface UserUsage {
  pageCount: number
  pagesBytes: number
}

/**
 * 사용자의 현재 저장 사용량 — user_storage_usage 뷰 기반
 */
export async function getUserUsage(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<UserUsage> {
  // user_storage_usage 뷰는 schema에 없으므로 raw select로
  const { data } = await admin
    .from('pages')
    .select('size_bytes')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const rows = data ?? []
  const pageCount = rows.length
  const pagesBytes = rows.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0)
  return { pageCount, pagesBytes }
}

export interface UsageCheckResult {
  allowed: boolean
  tier: Tier
  storageBytes: number    // 한도
  pagesBytes: number       // 현재 사용량
  needed: number           // 추가될 바이트
  reason?: string
}

/**
 * 페이지 생성 전 사용량 한도 체크
 *
 * 익명 사용자(userId null)는 한도 적용 안 함 → 기존 정책 유지
 */
export async function checkStorageQuota(
  admin: SupabaseClient<Database>,
  userId: string | null,
  newBytes: number,
): Promise<UsageCheckResult | null> {
  if (!userId) return null

  const { TIERS } = await import('@/lib/tiers')
  const tier = await getUserTier(admin, userId)
  const { pagesBytes } = await getUserUsage(admin, userId)
  const limit = TIERS[tier].storageBytes

  const wouldUse = pagesBytes + newBytes
  if (wouldUse > limit) {
    return {
      allowed: false,
      tier,
      storageBytes: limit,
      pagesBytes,
      needed: newBytes,
      reason: `${TIERS[tier].name} 티어의 저장 용량(${formatBytes(limit)})을 초과해요. 현재 ${formatBytes(pagesBytes)} 사용 중이고, 이 페이지는 ${formatBytes(newBytes)}예요.`,
    }
  }

  return {
    allowed: true,
    tier,
    storageBytes: limit,
    pagesBytes,
    needed: newBytes,
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}
