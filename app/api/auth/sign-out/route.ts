import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  const { origin } = new URL(req.url)
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
