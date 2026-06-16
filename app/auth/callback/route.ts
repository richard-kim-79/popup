import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const { searchParams } = url
  // Vercel 뒤에서 origin이 내부 URL일 수 있어 환경변수 우선 사용
  const origin = (process.env.NEXT_PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, '')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/my-pages'

  // Google이 에러를 직접 돌려보낸 경우 (사용자가 동의 거절 등)
  const providerError = searchParams.get('error') ?? searchParams.get('error_description')
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // PKCE 검증자 쿠키 부재(다른 호스트/탭/스토리지 초기화 등) → 영문 원문 대신 재시도 안내
    const isPkce = /code verifier|pkce/i.test(error.message)
    const msg = isPkce
      ? '로그인 세션이 만료됐어요. 같은 창에서 다시 시도해 주세요.'
      : error.message
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
