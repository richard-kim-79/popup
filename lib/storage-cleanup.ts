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

/**
 * blocks에서 참조하는 media 파일명 집합 추출 (image/video/link 블록의 url).
 * 저장 경로가 아닌 크론에서 orphan 판별용으로 사용.
 */
function referencedFilenames(blocks: unknown[], slug: string): Set<string> {
  const referenced = new Set<string>()
  for (const b of blocks) {
    const url = (b as { url?: unknown }).url
    if (typeof url === 'string' && url.includes(`/${slug}/`)) {
      const fname = url.split('/').pop()
      if (fname) referenced.add(fname)
    }
  }
  return referenced
}

/**
 * 최근 업로드 파일 보호 구간(ms).
 * 업로드는 "빈 이미지 블록 저장 → 클라이언트가 스토리지에 직접 PUT → url 채운 블록 재저장"
 * 순서라, 방금 올라온(또는 올라오는 중인) 파일이 잠깐 미참조 상태로 보일 수 있다.
 * 이 시간 이내에 생성된 객체는 삭제 대상에서 제외한다.
 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000

/** 한 번의 크론 실행에서 훑을 최대 페이지 수(런타임/부하 상한) */
const SWEEP_PAGE_LIMIT = 400
/** orphan 후보로 볼 최근 수정 페이지 범위 — orphan은 편집 시에만 생기므로 최근 것만 훑음 */
const SWEEP_RECENT_DAYS = 3

export interface SweepResult {
  scannedPages: number
  removedObjects: number
}

/**
 * 최근 편집된 페이지들의 storage {slug}/ 객체 중 blocks가 더 이상 참조하지 않는
 * (그리고 보호 구간을 지난) orphan 파일을 제거. 저장 경로가 아닌 크론에서 호출.
 *
 * 과거엔 blocks 저장마다 인라인 cleanup을 돌렸는데, 방금 올라온 파일을 orphan으로
 * 오인해 지우는 레이스가 있었다. 저장 경로에서 분리해 여기로 이전한다.
 */
export async function sweepOrphans(
  admin: ReturnType<typeof getSupabaseAdmin>,
): Promise<SweepResult> {
  const recentIso = new Date(Date.now() - SWEEP_RECENT_DAYS * 86400000).toISOString()
  const { data: pages } = await admin
    .from('pages')
    .select('slug, blocks')
    .is('deleted_at', null)
    .gt('updated_at', recentIso)
    .order('updated_at', { ascending: false })
    .limit(SWEEP_PAGE_LIMIT)

  if (!pages || pages.length === 0) return { scannedPages: 0, removedObjects: 0 }

  const now = Date.now()
  let removedObjects = 0

  for (const page of pages) {
    const slug = page.slug as string
    const blocks = (page.blocks ?? []) as unknown[]
    const referenced = referencedFilenames(blocks, slug)

    const { data: objects } = await admin.storage.from(BUCKET).list(slug, { limit: 1000 })
    if (!objects || objects.length === 0) continue

    const toRemove = objects
      .filter((o) => !referenced.has(o.name))
      .filter((o) => {
        // 생성시각 불명이면 안전하게 보존(방금 올라온 파일 보호)
        const created = o.created_at ? new Date(o.created_at).getTime() : NaN
        return Number.isFinite(created) && now - created > ORPHAN_GRACE_MS
      })
      .map((o) => `${slug}/${o.name}`)

    if (toRemove.length > 0) {
      const { error } = await admin.storage.from(BUCKET).remove(toRemove)
      if (!error) removedObjects += toRemove.length
    }
  }

  return { scannedPages: pages.length, removedObjects }
}
