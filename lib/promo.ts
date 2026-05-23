// ============================================================
// 무료 연장 이벤트 — 2026-08-23까지 모든 수명 연장 무료
// 환경변수 없이 상수로 관리 — 종료일 지나면 자동으로 유료 흐름 복귀
// ============================================================

// KST 기준 2026-08-23 23:59:59 (= UTC 14:59:59)
export const FREE_EXTENSION_UNTIL = '2026-08-23T14:59:59Z'

export function isFreeExtensionPeriod(now: Date = new Date()): boolean {
  return now < new Date(FREE_EXTENSION_UNTIL)
}

export const PROMO_HEADLINE = '🎉 이벤트 — 8월 23일까지 모든 연장 무료'

// 플랜별 일수 (free-extend / confirm에서 공유)
export const PLAN_DAYS: Record<'month' | 'year', number> = {
  month: 30,
  year: 365,
}
