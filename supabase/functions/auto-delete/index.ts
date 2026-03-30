import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase Edge Function: auto-delete
// Cron: "0 15 * * *" (UTC 15:00 = KST 00:00)
// delete_at 지난 페이지를 soft delete (deleted_at 설정)

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('pages')
    .update({ deleted_at: new Date().toISOString() })
    .lt('delete_at', new Date().toISOString())
    .is('deleted_at', null)
    .select('id, slug')

  if (error) {
    console.error('[auto-delete] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[auto-delete] Soft-deleted ${count} pages`)
  return new Response(JSON.stringify({ deleted: count }), { status: 200 })
})
