// ============================================================
// Public API v1 — Single Page (GET / DELETE)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'
import { authenticateApiKey, isApiError, apiError } from '@/lib/api-key-middleware'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { daysLeft } from '@/lib/slug'
import type { Block } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()

interface Params {
  params: Promise<{ slug: string }>
}

export function OPTIONS() {
  return corsPreflightResponse()
}

/** GET /api/v1/pages/:slug — 페이지 조회 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req, 'pages:read')
  if (isApiError(auth)) return withCors(auth)

  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('pages')
    .select('id, slug, blocks, locked, expires_at, view_count, api_key_id, created_at, updated_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return withCors(apiError('PAGE_NOT_FOUND', `Page "${slug}" not found`, 404))
  }

  // 소유권 확인: 자기 API 키로 만든 페이지만 상세 조회 가능
  // (공개 페이지는 누구나 조회 가능하지만, API에서는 소유 페이지만)
  if (data.api_key_id !== auth.id) {
    return withCors(apiError('FORBIDDEN', 'You can only access pages created with your API key', 403))
  }

  return withCors(
    NextResponse.json({
      slug: data.slug,
      url: `${BASE_URL}/${data.slug}`,
      blocks: data.blocks as unknown as Block[],
      locked: data.locked,
      expiresAt: data.expires_at,
      daysLeft: daysLeft(data.expires_at),
      viewCount: data.view_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }),
  )
}

/** DELETE /api/v1/pages/:slug — 페이지 삭제 (soft delete) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req, 'pages:delete')
  if (isApiError(auth)) return withCors(auth)

  const { slug } = await params
  const supabase = getSupabaseAdmin()

  // 소유권 확인
  const { data: page } = await supabase
    .from('pages')
    .select('id, api_key_id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!page) {
    return withCors(apiError('PAGE_NOT_FOUND', `Page "${slug}" not found`, 404))
  }

  if (page.api_key_id !== auth.id) {
    return withCors(apiError('FORBIDDEN', 'You can only delete pages created with your API key', 403))
  }

  const { error } = await supabase
    .from('pages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', page.id)

  if (error) {
    return withCors(apiError('DELETE_FAILED', 'Failed to delete page', 500))
  }

  return withCors(NextResponse.json({ success: true, slug }))
}
