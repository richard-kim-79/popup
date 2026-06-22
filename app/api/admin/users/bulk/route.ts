import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { Json } from '@/types'

type BulkAction = 'ban' | 'unban' | 'lock_pages' | 'hide_gallery'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null) as { ids?: unknown; action?: unknown } | null
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === 'string') : []
  const action = body?.action as BulkAction

  if (ids.length === 0) return NextResponse.json({ error: '대상이 없습니다.' }, { status: 400 })

  const admin = getSupabaseAdmin()

  if (action === 'ban' || action === 'unban') {
    const ban_duration = action === 'ban' ? '876000h' : 'none'
    await Promise.all(ids.map((id) =>
      admin.auth.admin.updateUserById(id, { ban_duration } as { ban_duration: string }).catch(() => {})))
  } else if (action === 'lock_pages') {
    await admin.from('pages').update({ locked: true }).in('user_id', ids).is('deleted_at', null)
  } else if (action === 'hide_gallery') {
    await admin.from('pages').update({ listed: false, gallery_opt_out: true }).in('user_id', ids).is('deleted_at', null)
  } else {
    return NextResponse.json({ error: '잘못된 액션입니다.' }, { status: 400 })
  }

  await admin.from('admin_actions').insert({
    action: `bulk_${action}`, target_type: 'users', target_id: null,
    meta: { ids, count: ids.length } as Json,
  })

  return NextResponse.json({ ok: true, count: ids.length })
}
