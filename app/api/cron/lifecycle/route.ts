import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { removePageStorage, sweepOrphans } from '@/lib/storage-cleanup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// soft-delete 후 이 기간이 지나면 storage(첨부 파일) 회수 (복원 유예)
const GRACE_DAYS = 7
const PURGE_BATCH = 200

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function run(): Promise<NextResponse> {
  const admin = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  // 1) 만료(expires_at 경과) 페이지 잠금 — 크론 미실행 방어
  const { data: lockedRows } = await admin
    .from('pages')
    .update({ locked: true })
    .eq('locked', false)
    .is('deleted_at', null)
    .lt('expires_at', nowIso)
    .select('id')

  // 2) delete_at 지난 페이지 soft-delete (라이프사이클)
  const { data: softRows } = await admin
    .from('pages')
    .update({ deleted_at: nowIso })
    .is('deleted_at', null)
    .lt('delete_at', nowIso)
    .select('id')

  // 3) soft-delete 후 유예기간 지난 페이지 → 첨부 storage 회수(재처리 방지 플래그)
  const graceIso = new Date(Date.now() - GRACE_DAYS * 86400000).toISOString()
  const { data: toPurge } = await admin
    .from('pages')
    .select('id, slug')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', graceIso)
    .is('storage_purged_at', null)
    .limit(PURGE_BATCH)

  let storageRemoved = 0
  const purgedIds: string[] = []
  for (const p of toPurge ?? []) {
    storageRemoved += await removePageStorage(admin, p.slug)
    purgedIds.push(p.id)
  }
  if (purgedIds.length > 0) {
    await admin.from('pages').update({ storage_purged_at: nowIso }).in('id', purgedIds)
  }

  // 4) 살아있는 페이지의 미참조 media 파일(orphan) 회수.
  //    (과거엔 blocks 저장마다 인라인 실행 → 방금 올라온 파일 오삭제 레이스가 있어 크론으로 이전)
  const sweep = await sweepOrphans(admin).catch(() => ({ scannedPages: 0, removedObjects: 0 }))

  return NextResponse.json({
    ok: true,
    locked: lockedRows?.length ?? 0,
    soft_deleted: softRows?.length ?? 0,
    storage_purged_pages: purgedIds.length,
    storage_objects_removed: storageRemoved,
    orphan_scanned_pages: sweep.scannedPages,
    orphan_objects_removed: sweep.removedObjects,
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return run()
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return run()
}
