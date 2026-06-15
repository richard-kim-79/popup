import { NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { getUserTier, getUserUsage } from '@/lib/subscription'
import { TIERS, UPGRADE_RECOMMEND_THRESHOLD, nextTier } from '@/lib/tiers'

interface UsageResponse {
  tier: string
  tierName: string
  pageCount: number
  textBytes: number       // 텍스트(html+blocks)
  attachmentBytes: number // 첨부 이미지·PDF
  usedBytes: number        // 합산 사용량
  limitBytes: number       // 티어 한도
  usageRatio: number       // 0~1
  recommendUpgrade: boolean
  nextTier: string | null
  nextTierName: string | null
}

/**
 * GET /api/subscriptions/usage
 *
 * 현재 사용자의 저장 용량 사용량 + 티어 한도 + 80% 도달 시 상향 추천
 */
export async function GET(): Promise<NextResponse<UsageResponse | { error: string }>> {
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const tier = await getUserTier(admin, user.id)
  const { pageCount, textBytes, storageBytes, totalBytes } = await getUserUsage(admin, user.id)
  const t = TIERS[tier]
  const usageRatio = t.storageBytes > 0 ? totalBytes / t.storageBytes : 0

  // 상향 추천: 80% 이상 + 다음 티어가 존재 (Pro는 상향 없음)
  const upTier = nextTier(tier)
  const recommendUpgrade = usageRatio >= UPGRADE_RECOMMEND_THRESHOLD && upTier !== null

  return NextResponse.json({
    tier,
    tierName: t.name,
    pageCount,
    textBytes,
    attachmentBytes: storageBytes,
    usedBytes: totalBytes,
    limitBytes: t.storageBytes,
    usageRatio,
    recommendUpgrade,
    nextTier: upTier,
    nextTierName: upTier ? TIERS[upTier].name : null,
  })
}
