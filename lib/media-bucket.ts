// ============================================================
// Storage media 버킷 공통 — 허용 MIME / 크기 / ensureBucket / 서명 업로드
// upload 라우트와 pdf 생성 라우트가 공유
// ============================================================

import { randomUUID } from 'node:crypto'
import type { getSupabaseAdmin } from '@/lib/supabase-server'

/** 허용 MIME — 이미지 / PDF / 영상 */
export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
])

export const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',   // .mov — iPhone 기본 포맷
  'video/webm',
  'video/x-m4v',
])

export const ALLOWED_MIME = new Set([...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME])

/** 이미지·PDF·영상 모두 50MB */
export const MEDIA_MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE ?? '') || 50 * 1024 * 1024

export const BUCKET = 'media'

// 버킷 초기화 여부 (프로세스 수명 동안 1회만 실행)
let bucketReady = false

export async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
  if (bucketReady) return

  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MEDIA_MAX_SIZE,
      allowedMimeTypes: [...ALLOWED_MIME],
    })
    if (error) throw new Error(`버킷 생성 실패: ${error.message}`)
  }
  // 기존 버킷은 건드리지 않음

  bucketReady = true
}

export interface SignedUpload {
  signedUrl: string
  token: string
  path: string
  publicUrl: string
}

/** {slug}/{timestamp}.{ext} 경로로 서명 업로드 URL + public URL 발급 */
export async function createMediaUpload(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  filename: string,
): Promise<SignedUpload> {
  await ensureBucket(supabase)
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  // {timestamp}-{random} — 같은 밀리초에 여러 파일이 올라와도 경로가 절대 겹치지 않음
  // (Date.now() 단독 사용 시 다중 드래그 업로드에서 충돌 → 덮어쓰기/실패 발생)
  const path = `${slug}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    throw new Error(`서명 URL 발급 실패: ${error?.message ?? '알 수 없는 오류'}`)
  }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { signedUrl: data.signedUrl, token: data.token, path: data.path, publicUrl }
}
