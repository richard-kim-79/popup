import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'done' | 'failed' | 'canceled' | null (all)

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('payments')
    .select('id, order_id, plan, amount, status, customer_email, paid_at, page_id, pages(slug)')
    .order('paid_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const { data } = await query

  const rows = data ?? []
  const totalRevenue = rows.reduce((sum: number, p: { status: string | null; amount: number | null }) => {
    if (p.status === 'done') return sum + (p.amount ?? 0)
    return sum
  }, 0)

  return NextResponse.json({ data: rows, totalRevenue })
}
