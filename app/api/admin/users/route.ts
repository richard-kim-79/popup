import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const PAGE_SIZE = 25

export interface AdminUserRow {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
  tier: string
  sub_status: string | null
  next_charge_at: string | null
  failed_charge_count: number
  cancel_at_period_end: boolean
  granted_by_admin: boolean
  revenue_total: number
  page_count: number
  text_bytes: number
  attachment_bytes: number
  report_total: number
  locked_count: number
  listed_count: number
  last_page_at: string | null
  total_count: number
}

type RpcResult = { data: AdminUserRow[] | null; error: { message: string } | null }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q = (searchParams.get('q') ?? '').trim()
  const tier = searchParams.get('tier') || null
  const status = searchParams.get('status') || null
  const sort = searchParams.get('sort') || 'created'
  const offset = (page - 1) * PAGE_SIZE

  const supabase = getSupabaseAdmin()
  // RPC는 생성된 타입(Functions)에 없으므로 명시적으로 캐스팅
  const callRpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<RpcResult>

  const { data, error } = await callRpc('admin_user_overview', {
    p_search: q,
    p_tier: tier,
    p_status: status,
    p_sort: sort,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  return NextResponse.json({ data: rows, total, page, pageSize: PAGE_SIZE })
}
