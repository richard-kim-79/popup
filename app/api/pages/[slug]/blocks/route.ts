import { NextRequest, NextResponse, after } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import { deriveListing } from '@/lib/listing'
import { extractPdfText } from '@/lib/pdf-text'
import type { ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ ok: true } | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null)

  if (!body?.editToken || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!verifyEditToken(body.editToken, slug)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  // 잠긴 페이지는 편집 불가
  const { data: page } = await supabase
    .from('pages')
    .select('locked, deleted_at, listed, auto_listed, gallery_opt_out, pdf_url')
    .eq('slug', slug)
    .single()

  if (!page || page.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (page.pdf_url) {
    return NextResponse.json({ error: 'PDF 페이지는 블록 편집할 수 없습니다.' }, { status: 400 })
  }

  if (page.locked) {
    return NextResponse.json({ error: '잠긴 페이지입니다. 플랜을 업그레이드하세요.' }, { status: 403 })
  }

  // ── 검색 갤러리 자동 노출(신규 페이지) — 콘텐츠가 생기면 자동 등록 ──
  // 옵트아웃 안 했고, (아직 미등록 또는 자동등록 페이지)이며, 제목 도출 가능할 때만.
  // 수동 등록(listed && !auto_listed)은 사용자 큐레이션이므로 건드리지 않는다.
  const update: Record<string, unknown> = { blocks: body.blocks }
  if (!page.gallery_opt_out && (page.auto_listed || !page.listed)) {
    const { title, description } = deriveListing(body.blocks)
    if (title) {
      update.listed = true
      update.auto_listed = true
      update.listing_title = title
      update.listing_description = description
      update.listed_at = new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('pages')
    .update(update)
    .eq('slug', slug)

  if (error) {
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }

  // ── orphan Storage 객체 정리 (fire-and-forget) ──────────────
  // 저장된 blocks에서 더 이상 참조되지 않는 media 파일 제거
  void cleanupOrphans(supabase, slug, body.blocks as unknown[]).catch(() => {})

  // ── PDF 첨부 내부 텍스트 색인 (응답 후 백그라운드) ─────────────
  // 응답을 막지 않도록 after()로 처리. attachment_text 갱신 → 트리거가 search_text 재계산.
  after(async () => {
    try { await indexPdfText(supabase, slug, body.blocks as unknown[]) } catch { /* 무시 */ }
  })

  return NextResponse.json({ ok: true })
}

/** PDF 최대 처리 크기 — 너무 큰 파일은 색인 생략(서버리스 메모리 보호) */
const MAX_PDF_BYTES = 15 * 1024 * 1024
const MAX_ATTACHMENT_CHARS = 30000

/**
 * blocks의 PDF 첨부에서 텍스트를 추출해 pages.attachment_text 갱신(검색 색인용).
 * - PDF 없음 → attachment_text=null로 정리
 * - 추출 실패만 발생 → 기존 값 보존(덮어쓰지 않음)
 */
async function indexPdfText(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  blocks: unknown[],
): Promise<void> {
  const urls = [...new Set(
    blocks
      .map((b) => b as { url?: unknown; mediaType?: unknown })
      .filter((b) => typeof b.url === 'string'
        && (b.mediaType === 'pdf' || /\.pdf($|\?)/i.test(b.url as string)))
      .map((b) => b.url as string),
  )]

  if (urls.length === 0) {
    // 첨부 PDF가 없으면 색인 텍스트 제거
    await supabase.from('pages').update({ attachment_text: null }).eq('slug', slug)
    return
  }

  let text = ''
  for (const url of urls) {
    if (text.length >= MAX_ATTACHMENT_CHARS) break
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const len = Number(res.headers.get('content-length') ?? 0)
      if (len && len > MAX_PDF_BYTES) continue
      const buf = new Uint8Array(await res.arrayBuffer())
      if (buf.byteLength > MAX_PDF_BYTES) continue
      const t = await extractPdfText(buf, MAX_ATTACHMENT_CHARS - text.length)
      if (t) text += (text ? ' ' : '') + t
    } catch { /* 개별 PDF 실패는 건너뜀 */ }
  }

  // 추출이 모두 실패하면 기존 값 보존(덮어쓰지 않음)
  if (text) {
    await supabase.from('pages').update({ attachment_text: text.slice(0, MAX_ATTACHMENT_CHARS) }).eq('slug', slug)
  }
}

/**
 * blocks에서 참조하는 media URL과 Storage의 {slug}/ 객체를 비교해
 * 미참조 객체를 삭제. 실패해도 blocks 저장 자체엔 영향 없음.
 */
async function cleanupOrphans(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  blocks: unknown[],
): Promise<void> {
  // 1. blocks에서 참조하는 파일명 집합 추출 (image/video/link 블록의 url)
  const referenced = new Set<string>()
  for (const b of blocks) {
    const url = (b as { url?: unknown }).url
    if (typeof url === 'string' && url.includes(`/${slug}/`)) {
      const fname = url.split('/').pop()
      if (fname) referenced.add(fname)
    }
  }

  // 2. Storage의 {slug}/ 객체 목록
  const { data: objects } = await supabase.storage.from('media').list(slug, { limit: 1000 })
  if (!objects || objects.length === 0) return

  // 3. 참조 안 되는 객체 → 삭제 대상
  const toRemove = objects
    .filter((o) => !referenced.has(o.name))
    .map((o) => `${slug}/${o.name}`)

  if (toRemove.length > 0) {
    await supabase.storage.from('media').remove(toRemove)
  }
}
