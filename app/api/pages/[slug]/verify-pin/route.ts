import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPin } from '@/lib/pin'
import { issueEditToken } from '@/lib/token'
import type { VerifyPinResponse, ApiError } from '@/types'

type Params = { params: Promise<{ slug: string }> }

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<VerifyPinResponse | ApiError>> {
  const { slug } = await params
  const body = await req.json().catch(() => null)

  if (!body?.pin || typeof body.pin !== 'string') {
    return NextResponse.json({ error: 'PIN을 입력해주세요.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('pages')
    .select('pin_hash, deleted_at')
    .eq('slug', slug)
    .single()

  if (error || !data || data.deleted_at) {
    return NextResponse.json({ error: '페이지를 찾을 수 없습니다.' }, { status: 404 })
  }

  const valid = await verifyPin(body.pin, data.pin_hash)
  if (!valid) {
    return NextResponse.json({ error: 'PIN이 올바르지 않습니다.' }, { status: 401 })
  }

  const editToken = issueEditToken(slug)
  return NextResponse.json({ editToken })
}
