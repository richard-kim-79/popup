// ============================================================
// 페이지 storage 정리 — media/{slug}/ 하위 객체 전부 제거
// (페이지 완전 삭제/라이프사이클 시 첨부 파일 회수)
// ============================================================

import type { getSupabaseAdmin } from '@/lib/supabase-server'

const BUCKET = 'media'

/**
 * 한 페이지(slug)에 속한 모든 storage 객체를 삭제하고 삭제 개수를 반환.
 * 물리 파일 제거를 위해 Storage API remove() 사용(테이블 행 직접 삭제 아님).
 */
export async function removePageStorage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
): Promise<number> {
  const { data: objects } = await admin.storage.from(BUCKET).list(slug, { limit: 1000 })
  if (!objects || objects.length === 0) return 0
  const paths = objects.map((o) => `${slug}/${o.name}`)
  const { error } = await admin.storage.from(BUCKET).remove(paths)
  if (error) return 0
  return paths.length
}
