import { nanoid } from 'nanoid'
import { getSupabaseAdmin } from './supabase-server'

// 6자리 slug 생성, DB unique 충돌 시 최대 3회 재시도
export async function generateUniqueSlug(): Promise<string> {
  const supabase = getSupabaseAdmin()
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(6)
    const { data } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!data) return slug
  }
  // 극히 드문 케이스: 12자리로 폴백
  return nanoid(12)
}

export function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
