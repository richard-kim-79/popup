import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase Edge Function: auto-lock
// Cron: "0 15 * * *" (UTC 15:00 = KST 00:00)
// expires_at 지난 페이지를 locked=true로 설정.
//
// v3 정책: 유료 구독자(active/past_due Lite/Pro)의 페이지는 만료 면제 → 잠그지 않음.
// 면제 대상: pages.user_id가 active/past_due subscription의 user_id와 일치하는 경우.

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. 라이프사이클 면제 사용자 ID 목록
  const { data: exemptUsers } = await supabase
    .from('subscriptions')
    .select('user_id')
    .in('status', ['active', 'past_due'])
    .in('tier', ['lite', 'pro'])

  const exemptUserIds = (exemptUsers ?? []).map((r) => r.user_id)

  // 2. 잠금 대상 페이지 조회 — 면제 사용자 제외
  let q = supabase
    .from('pages')
    .update({ locked: true })
    .lt('expires_at', new Date().toISOString())
    .eq('locked', false)
    .is('deleted_at', null)

  if (exemptUserIds.length > 0) {
    // user_id가 NULL이거나 (익명) 면제 목록에 없는 경우만 잠금
    q = q.or(`user_id.is.null,user_id.not.in.(${exemptUserIds.join(',')})`)
  }

  const { data, error } = await q.select('id, slug')

  if (error) {
    console.error('[auto-lock] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[auto-lock] Locked ${count} pages (exempt users: ${exemptUserIds.length})`)
  return new Response(JSON.stringify({ locked: count, exemptUsers: exemptUserIds.length }), { status: 200 })
})
