import type { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com').trim()

  // 공개·잠금해제된 페이지만 색인
  const supabase = getSupabaseAdmin()
  const { data: pages } = await supabase
    .from('pages')
    .select('slug, updated_at')
    .is('deleted_at', null)
    .eq('locked', false)
    .order('created_at', { ascending: false })
    .limit(1000)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  const dynamicRoutes: MetadataRoute.Sitemap = (pages ?? []).map((p) => ({
    url: `${BASE}/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...dynamicRoutes]
}
