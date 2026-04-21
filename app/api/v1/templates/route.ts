// ============================================================
// Public API v1 — Templates (GET 목록 / POST 템플릿으로 생성)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'
import { authenticateApiKey, isApiError, apiError } from '@/lib/api-key-middleware'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateUniqueSlug } from '@/lib/slug'
import { assignBlockIds } from '@/lib/validate-blocks'
import { templates, getTemplateById } from '@/lib/templates'
import type { Json } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()
const DEFAULT_DAYS = 30

export function OPTIONS() {
  return corsPreflightResponse()
}

/** GET /api/v1/templates — 템플릿 목록 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'pages:read')
  if (isApiError(auth)) return withCors(auth)

  const list = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    blockCount: t.blocks.length,
  }))

  return withCors(NextResponse.json({ data: list }))
}

/** POST /api/v1/templates — 템플릿으로 페이지 생성 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'pages:create')
  if (isApiError(auth)) return withCors(auth)

  const body = await req.json().catch(() => null) as {
    templateId?: string
    overrides?: Record<string, unknown>[]
  } | null

  if (!body?.templateId) {
    return withCors(apiError('INVALID_INPUT', 'templateId is required', 400))
  }

  const template = getTemplateById(body.templateId)
  if (!template) {
    return withCors(apiError(
      'TEMPLATE_NOT_FOUND',
      `Template "${body.templateId}" not found. Use GET /api/v1/templates to see available templates.`,
      404,
    ))
  }

  // overrides: 인덱스 기반으로 블록 필드 덮어쓰기
  let rawBlocks = template.blocks.map((b) => ({ ...b })) as Record<string, unknown>[]
  if (body.overrides && Array.isArray(body.overrides)) {
    for (let i = 0; i < Math.min(body.overrides.length, rawBlocks.length); i++) {
      if (body.overrides[i] && typeof body.overrides[i] === 'object') {
        rawBlocks[i] = { ...rawBlocks[i], ...body.overrides[i] }
      }
    }
  }

  const blocks = assignBlockIds(rawBlocks)
  const slug = await generateUniqueSlug()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEFAULT_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const deleteAt = new Date(now.getTime() + (DEFAULT_DAYS + 7) * 24 * 60 * 60 * 1000).toISOString()

  const supabase = getSupabaseAdmin()

  const { data: page, error } = await supabase
    .from('pages')
    .insert({
      slug,
      blocks: blocks as unknown as Json,
      pin_hash: '__api_key__',
      expires_at: expiresAt,
      delete_at: deleteAt,
      api_key_id: auth.id,
    })
    .select('id, slug, created_at, expires_at')
    .single()

  if (error || !page) {
    return withCors(apiError('CREATE_FAILED', 'Failed to create page from template', 500))
  }

  await supabase.from('api_key_pages').insert({
    api_key_id: auth.id,
    page_id: page.id as string,
  })

  return withCors(
    NextResponse.json({
      slug: page.slug,
      url: `${BASE_URL}/${page.slug}`,
      templateId: body.templateId,
      blocks,
      createdAt: page.created_at,
      expiresAt: page.expires_at,
    }, { status: 201 }),
  )
}
