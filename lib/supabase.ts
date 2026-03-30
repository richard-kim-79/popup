import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types'

// 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트
// 단일 인스턴스 재사용
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (client) return client
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
