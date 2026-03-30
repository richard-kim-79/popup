import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { hashPin } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import { generateUniqueSlug } from '@/lib/slug'
import type { CreatePageResponse, ApiError } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<CreatePageResponse | ApiError>> {
  const body = await req.json().catch(() => null)

  if (!body?.pin || typeof body.pin !== 'string' || body.pin.length < 4 || body.pin.length > 8) {
    return NextResponse.json({ error: 'PIN은 4~8자리여야 합니다.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const slug = await generateUniqueSlug()
  const pin_hash = await hashPin(body.pin)

  const now = new Date()
  const expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const delete_at  = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('pages').insert({
    slug,
    blocks: body.blocks ?? [],
    pin_hash,
    expires_at,
    delete_at,
    locked: false,
    user_id: null,
  })

  if (error) {
    console.error('[POST /api/pages]', error.message)
    return NextResponse.json({ error: '페이지 생성에 실패했습니다.' }, { status: 500 })
  }

  const editToken = issueEditToken(slug)
  return NextResponse.json({ slug, editToken }, { status: 201 })
}
