import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

type Action = 'delete' | 'restore' | 'unlock'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params
  const { action } = await req.json() as { action: Action }
  const supabase = getSupabaseAdmin()

  let update: Record<string, unknown>
  if (action === 'delete') {
    update = { deleted_at: new Date().toISOString() }
  } else if (action === 'restore') {
    update = { deleted_at: null }
  } else if (action === 'unlock') {
    const extended = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    update = { locked: false, expires_at: extended }
  } else {
    return NextResponse.json({ error: '잘못된 액션입니다.' }, { status: 400 })
  }

  const { error } = await supabase.from('pages').update(update).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
