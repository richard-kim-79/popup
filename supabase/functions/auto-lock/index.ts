import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase Edge Function: auto-lock
// Cron: "0 15 * * *" (UTC 15:00 = KST 00:00)
// expires_at 지난 페이지를 locked=true로 설정

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('pages')
    .update({ locked: true })
    .lt('expires_at', new Date().toISOString())
    .eq('locked', false)
    .is('deleted_at', null)
    .select('id, slug')

  if (error) {
    console.error('[auto-lock] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[auto-lock] Locked ${count} pages`)
  return new Response(JSON.stringify({ locked: count }), { status: 200 })
})
