// ============================================================
// page_events 기록 헬퍼 — 채널별 전환(유입→생성) 측정
// page_events는 Database 타입에 없으므로 any 캐스트(RLS로 service_role만 기록).
// 항상 fire-and-forget: 실패해도 본 흐름에 영향 없음.
// ============================================================

import type { getSupabaseAdmin } from '@/lib/supabase-server'

type Admin = ReturnType<typeof getSupabaseAdmin>
export type PageEventType = 'arrival' | 'created'

export function logPageEvent(
  admin: Admin,
  eventType: PageEventType,
  source: string | null,
  slug?: string,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (admin as any)
    .from('page_events')
    .insert({ event_type: eventType, source, slug: slug ?? null })
    .then(() => {}, () => {})
}
