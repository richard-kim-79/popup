// ============================================================
// Public API v1 — Pages (POST 생성 / GET 목록)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'
import { authenticateApiKey, isApiError, apiError } from '@/lib/api-key-middleware'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateUniqueSlug } from '@/lib/slug'
import { validateBlocks, assignBlockIds } from '@/lib/validate-blocks'
import { hashPin } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import type { Block, Json } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()
const DEFAULT_DAYS = 30

export function OPTIONS() {
  return corsPreflightResponse()
}

/** POST /api/v1/pages — 페이지 생성 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'pages:create')
  if (isApiError(auth)) return withCors(auth)

  const body = await req.json().catch(() => null) as { blocks?: unknown; title?: string; pin?: string } | null
  if (!body?.blocks) {
    return withCors(apiError('INVALID_INPUT', 'blocks array is required', 400))
  }

  const validation = validateBlocks(body.blocks)
  if (!validation.valid) {
    return withCors(apiError('INVALID_BLOCKS', validation.error ?? 'Invalid blocks', 400))
  }

  const blocks = assignBlockIds(body.blocks as Record<string, unknown>[])
  const slug = await generateUniqueSlug()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEFAULT_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const deleteAt = new Date(now.getTime() + (DEFAULT_DAYS + 7) * 24 * 60 * 60 * 1000).toISOString()

  // PIN: 호출자가 전달하면 사용, 없으면 4자리 자동 생성
  const pin = (typeof body.pin === 'string' && body.pin.length >= 4)
    ? body.pin
    : Math.floor(1000 + Math.random() * 9000).toString()
  const pin_hash = await hashPin(pin)
  const editToken = issueEditToken(slug)

  const supabase = getSupabaseAdmin()

  const { data: page, error } = await supabase
    .from('pages')
    .insert({
      slug,
      blocks: blocks as unknown as Json,
      pin_hash,
      expires_at: expiresAt,
      delete_at: deleteAt,
      api_key_id: auth.id,
    })
    .select('id, slug, created_at, expires_at')
    .single()

  if (error || !page) {
    return withCors(apiError('CREATE_FAILED', 'Failed to create page', 500))
  }

  // api_key_pages 관계 기록
  await supabase.from('api_key_pages').insert({
    api_key_id: auth.id,
    page_id: page.id as string,
  })

  return withCors(
    NextResponse.json({
      slug: page.slug,
      url: `${BASE_URL}/${page.slug}`,
      editUrl: `${BASE_URL}/${page.slug}/edit`,
      pin,           // 생성 시 1회 반환 — 클라이언트가 반드시 저장해야 함
      editToken,
      blocks,
      createdAt: page.created_at,
      expiresAt: page.expires_at,
    }, { status: 201 }),
  )
}

/** GET /api/v1/pages — 내 API 키로 생성한 페이지 목록 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'pages:read')
  if (isApiError(auth)) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
  const offset = (page - 1) * pageSize

  const supabase = getSupabaseAdmin()

  const { data, count, error } = await supabase
    .from('pages')
    .select('id, slug, blocks, locked, expires_at, view_count, created_at, updated_at', { count: 'exact' })
    .eq('api_key_id', auth.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    return withCors(apiError('FETCH_FAILED', 'Failed to fetch pages', 500))
  }

  const pages = (data ?? []).map((p) => ({
    slug: p.slug,
    url: `${BASE_URL}/${p.slug}`,
    blocks: p.blocks as unknown as Block[],
    locked: p.locked,
    expiresAt: p.expires_at,
    viewCount: p.view_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }))

  return withCors(
    NextResponse.json({
      data: pages,
      total: count ?? 0,
      page,
      pageSize,
    }),
  )
}
