import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPin } from '@/lib/pin'

type Params = { params: Promise<{ slug: string }> }

/**
 * POST /api/pages/[slug]/list
 * PIN 인증 후 페이지를 검색 디렉토리에 등록.
 * 이미 등록된 경우 제목·설명을 업데이트함.
 */
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ listed: boolean } | { error: string }>> {
  const { slug } = await params
  const body = await req.json().catch(() => null) as {
    pin?: unknown
    listing_title?: unknown
    listing_description?: unknown
  } | null

  if (!body?.pin || typeof body.pin !== 'string') {
    return NextResponse.json({ error: 'PIN을 입력해주세요.' }, { status: 400 })
  }

  const listingTitle = typeof body.listing_title === 'string' ? body.listing_title.trim() : ''
  if (!listingTitle) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 })
  }

  const listingDescription =
    typeof body.listing_description === 'string' ? body.listing_description.trim() || null : null

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

  const { error: updateError } = await supabase
    .from('pages')
    .update({
      listed: true,
      listing_title: listingTitle,
      listing_description: listingDescription,
      listed_at: new Date().toISOString(),
    })
    .eq('slug', slug)

  if (updateError) {
    return NextResponse.json({ error: '등록 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ listed: true })
}

/**
 * DELETE /api/pages/[slug]/list
 * PIN 인증 후 페이지를 검색 디렉토리에서 제거.
 */
export async function DELETE(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ listed: boolean } | { error: string }>> {
  const { slug } = await params
  const body = await req.json().catch(() => null) as { pin?: unknown } | null

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

  const { error: updateError } = await supabase
    .from('pages')
    .update({
      listed: false,
      listing_title: null,
      listing_description: null,
      listed_at: null,
    })
    .eq('slug', slug)

  if (updateError) {
    return NextResponse.json({ error: '해제 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ listed: false })
}
