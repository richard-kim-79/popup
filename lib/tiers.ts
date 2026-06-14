// ============================================================
// 구독 티어 정의 — Free / Lite / Pro
//
// - Free: 비로그인 + 로그인 무과금
// - Lite: 월 3,900원 / 연 39,000원 (17% 할인)
// - Pro:  월 9,900원 / 연 99,000원 (17% 할인)
// ============================================================

export type Tier = 'free' | 'lite' | 'pro'
export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused'

const MB = 1024 * 1024
const GB = 1024 * MB

export interface TierLimits {
  name: string
  storageBytes: number      // 최대 저장 용량
  pageLimit: number          // 최대 페이지 수 (-1 = 무제한)
  expiresPages: boolean      // true면 정책 v2(30일 만료) 적용, false면 만료 면제
  customDomain: boolean
  priceMonthly: number       // KRW
  priceYearly: number        // KRW
}

export const TIERS: Record<Tier, TierLimits> = {
  free: {
    name: 'Free',
    storageBytes: 50 * MB,
    pageLimit: 10,
    expiresPages: true,
    customDomain: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  lite: {
    name: 'Lite',
    storageBytes: 1 * GB,
    pageLimit: 50,
    expiresPages: false,
    customDomain: false,
    priceMonthly: 3900,
    priceYearly: 39000,
  },
  pro: {
    name: 'Pro',
    storageBytes: 10 * GB,
    pageLimit: -1,
    expiresPages: false,
    customDomain: true,
    priceMonthly: 9900,
    priceYearly: 99000,
  },
}

export function priceFor(tier: Tier, cycle: BillingCycle): number {
  const t = TIERS[tier]
  return cycle === 'yearly' ? t.priceYearly : t.priceMonthly
}

/** 다음 주기 종료 시각 계산 — 기준 시점 + (monthly: 1개월 / yearly: 1년) */
export function nextPeriodEnd(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from.getTime())
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

/** customerKey 형식 — auth.users.id를 그대로 사용 (UUID 36자, 안정적) */
export function customerKeyFor(userId: string): string {
  return userId
}
