import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyEditToken } from '@/lib/token'
import { hashPin } from '@/lib/pin'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const body = await req.json().catch(() => null) as { editToken?: string; newPin?: string } | null

  if (!body?.editToken || !body?.newPin) {
    return NextResponse.json({ error: '필수 파라미터가 없습니다.' }, { status: 400 })
  }

  if (!verifyEditToken(body.editToken, slug)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 })
  }

  if (body.newPin.length < 4 || body.newPin.length > 8 || !/^\d+$/.test(body.newPin)) {
    return NextResponse.json({ error: '비밀번호는 숫자 4~8자리여야 합니다.' }, { status: 400 })
  }

  const pin_hash = await hashPin(body.newPin)
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('pages')
    .update({ pin_hash })
    .eq('slug', slug)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ error: '업데이트에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
