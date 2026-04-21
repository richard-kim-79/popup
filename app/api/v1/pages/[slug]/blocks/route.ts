// ============================================================
// Public API v1 — Blocks (PUT 전체 교체 / PATCH 부분 편집)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'
import { authenticateApiKey, isApiError, apiError } from '@/lib/api-key-middleware'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { validateBlocks, assignBlockIds } from '@/lib/validate-blocks'
import type { Block, Json } from '@/types'

interface Params {
  params: Promise<{ slug: string }>
}

export function OPTIONS() {
  return corsPreflightResponse()
}

/** 소유권 확인 후 페이지 데이터 반환 */
async function getOwnedPage(slug: string, apiKeyId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('pages')
    .select('id, blocks, api_key_id, locked')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) return { error: 'PAGE_NOT_FOUND' as const }
  if (data.api_key_id !== apiKeyId) return { error: 'FORBIDDEN' as const }
  if (data.locked) return { error: 'PAGE_LOCKED' as const }

  return { page: data }
}

/** PUT /api/v1/pages/:slug/blocks — 블록 전체 교체 */
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req, 'pages:update')
  if (isApiError(auth)) return withCors(auth)

  const { slug } = await params
  const body = await req.json().catch(() => null) as { blocks?: unknown } | null

  if (!body?.blocks) {
    return withCors(apiError('INVALID_INPUT', 'blocks array is required', 400))
  }

  const validation = validateBlocks(body.blocks)
  if (!validation.valid) {
    return withCors(apiError('INVALID_BLOCKS', validation.error ?? 'Invalid blocks', 400))
  }

  const result = await getOwnedPage(slug, auth.id)
  if (result.error) {
    const msgs: Record<string, [string, number]> = {
      PAGE_NOT_FOUND: [`Page "${slug}" not found`, 404],
      FORBIDDEN: ['You can only update pages created with your API key', 403],
      PAGE_LOCKED: ['This page is locked and cannot be edited', 423],
    }
    const [msg, status] = msgs[result.error]
    return withCors(apiError(result.error, msg, status))
  }

  const blocks = assignBlockIds(body.blocks as Record<string, unknown>[])
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('pages')
    .update({ blocks: blocks as unknown as Json })
    .eq('id', result.page!.id)

  if (error) {
    return withCors(apiError('UPDATE_FAILED', 'Failed to update blocks', 500))
  }

  return withCors(NextResponse.json({ slug, blocks }))
}

// --- PATCH 배치 연산 타입 ---

interface InsertOp {
  op: 'insert'
  index?: number       // 생략 시 끝에 추가
  block: Record<string, unknown>
}

interface UpdateOp {
  op: 'update'
  blockId: string
  changes: Record<string, unknown>
}

interface DeleteOp {
  op: 'delete'
  blockId: string
}

interface MoveOp {
  op: 'move'
  blockId: string
  toIndex: number
}

type BlockOp = InsertOp | UpdateOp | DeleteOp | MoveOp

/** PATCH /api/v1/pages/:slug/blocks — 부분 편집 (insert/update/delete/move) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req, 'pages:update')
  if (isApiError(auth)) return withCors(auth)

  const { slug } = await params
  const body = await req.json().catch(() => null) as { operations?: BlockOp[] } | null

  if (!body?.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
    return withCors(apiError('INVALID_INPUT', 'operations array is required', 400))
  }

  if (body.operations.length > 50) {
    return withCors(apiError('INVALID_INPUT', 'Maximum 50 operations per request', 400))
  }

  const result = await getOwnedPage(slug, auth.id)
  if (result.error) {
    const msgs: Record<string, [string, number]> = {
      PAGE_NOT_FOUND: [`Page "${slug}" not found`, 404],
      FORBIDDEN: ['You can only update pages created with your API key', 403],
      PAGE_LOCKED: ['This page is locked and cannot be edited', 423],
    }
    const [msg, status] = msgs[result.error]
    return withCors(apiError(result.error, msg, status))
  }

  // 기존 블록을 mutable 배열로
  let blocks = [...(result.page!.blocks as unknown as Block[])]
  const { nanoid } = require('nanoid') as { nanoid: (size?: number) => string }

  for (let i = 0; i < body.operations.length; i++) {
    const op = body.operations[i]

    switch (op.op) {
      case 'insert': {
        const newBlock = { ...op.block, id: (op.block.id as string) || nanoid(10) } as Block
        const idx = op.index ?? blocks.length
        blocks.splice(Math.min(idx, blocks.length), 0, newBlock)
        break
      }
      case 'update': {
        const idx = blocks.findIndex((b) => b.id === op.blockId)
        if (idx === -1) {
          return withCors(apiError('BLOCK_NOT_FOUND', `Block "${op.blockId}" not found (operation ${i})`, 400))
        }
        blocks[idx] = { ...blocks[idx], ...op.changes, id: blocks[idx].id } as Block
        break
      }
      case 'delete': {
        const idx = blocks.findIndex((b) => b.id === op.blockId)
        if (idx === -1) {
          return withCors(apiError('BLOCK_NOT_FOUND', `Block "${op.blockId}" not found (operation ${i})`, 400))
        }
        blocks.splice(idx, 1)
        break
      }
      case 'move': {
        const idx = blocks.findIndex((b) => b.id === op.blockId)
        if (idx === -1) {
          return withCors(apiError('BLOCK_NOT_FOUND', `Block "${op.blockId}" not found (operation ${i})`, 400))
        }
        const [block] = blocks.splice(idx, 1)
        const toIdx = Math.min(Math.max(0, op.toIndex), blocks.length)
        blocks.splice(toIdx, 0, block)
        break
      }
      default:
        return withCors(apiError('INVALID_OP', `Unknown operation "${(op as Record<string, unknown>).op}" (operation ${i})`, 400))
    }
  }

  // 결과 유효성 검증
  const validation = validateBlocks(blocks)
  if (!validation.valid) {
    return withCors(apiError('INVALID_RESULT', `Operations produced invalid blocks: ${validation.error}`, 400))
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('pages')
    .update({ blocks: blocks as unknown as Json })
    .eq('id', result.page!.id)

  if (error) {
    return withCors(apiError('UPDATE_FAILED', 'Failed to update blocks', 500))
  }

  return withCors(NextResponse.json({ slug, blocks }))
}
