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
  textBytes: number       // html_content + blocks JSON
  storageBytes: number    // 첨부 이미지·PDF (storage.objects)
  totalBytes: number      // text + storage
}

/**
 * 사용자의 현재 저장 사용량 — 텍스트(pages.size_bytes) + 첨부(storage.objects RPC)
 */
export async function getUserUsage(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<UserUsage> {
  const { data } = await admin
    .from('pages')
    .select('size_bytes')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const rows = data ?? []
  const pageCount = rows.length
  const textBytes = rows.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0)

  // 첨부파일(Storage) 용량 — SECURITY DEFINER RPC
  let storageBytes = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sb } = await (admin as any).rpc('get_user_storage_bytes', { p_user_id: userId })
  if (typeof sb === 'number') storageBytes = sb
  else if (typeof sb === 'string') storageBytes = parseInt(sb, 10) || 0

  return {
    pageCount,
    textBytes,
    storageBytes,
    totalBytes: textBytes + storageBytes,
  }
}

export interface UsageCheckResult {
  allowed: boolean
  tier: Tier
  limitBytes: number      // 티어 한도
  usedBytes: number        // 현재 총 사용량 (텍스트 + 첨부)
  needed: number           // 추가될 바이트
  reason?: string
}

/**
 * 페이지 생성·파일 업로드 전 사용량 한도 체크 (텍스트 + 첨부 합산 기준)
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
  const { totalBytes } = await getUserUsage(admin, userId)
  const limit = TIERS[tier].storageBytes

  const wouldUse = totalBytes + newBytes
  if (wouldUse > limit) {
    return {
      allowed: false,
      tier,
      limitBytes: limit,
      usedBytes: totalBytes,
      needed: newBytes,
      reason: `${TIERS[tier].name} 티어의 저장 용량(${formatBytes(limit)})을 초과해요. 현재 ${formatBytes(totalBytes)} 사용 중이고, 이번 항목은 ${formatBytes(newBytes)}예요.`,
    }
  }

  return {
    allowed: true,
    tier,
    limitBytes: limit,
    usedBytes: totalBytes,
    needed: newBytes,
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}
