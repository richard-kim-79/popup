// ============================================================
// OAuth 2.1 Authorization Endpoint (PKCE) — 기존 구글 로그인 재사용
// GET /api/oauth/authorize?response_type=code&client_id=...&redirect_uri=...
//   &code_challenge=...&code_challenge_method=S256&state=...&resource=...&scope=...
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase-server'
import { sha256, randomToken, CODE_TTL_SEC, BASE } from '@/lib/oauth'

export const runtime = 'nodejs'

function errorPage(message: string, status = 400): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;text-align:center;color:#1A1812">`
    + `<h2>연결 오류</h2><p>${message}</p></body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

/** redirect_uri 로 OAuth 에러 리다이렉트 */
function redirectError(redirectUri: string, error: string, state: string | null): NextResponse {
  const u = new URL(redirectUri)
  u.searchParams.set('error', error)
  if (state) u.searchParams.set('state', state)
  return NextResponse.redirect(u.toString())
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const p = req.nextUrl.searchParams
  const responseType = p.get('response_type')
  const clientId = p.get('client_id')
  const redirectUri = p.get('redirect_uri')
  const codeChallenge = p.get('code_challenge')
  const codeChallengeMethod = p.get('code_challenge_method')
  const state = p.get('state')
  const resource = p.get('resource')
  const scope = p.get('scope')

  if (!clientId || !redirectUri) {
    return errorPage('client_id 또는 redirect_uri가 없습니다.')
  }

  const admin = getSupabaseAdmin()
  const { data: client } = await admin
    .from('oauth_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  // 클라이언트/redirect_uri 검증 실패 시 리다이렉트하지 않고 에러 페이지
  if (!client) return errorPage('등록되지 않은 클라이언트입니다.')
  if (!client.redirect_uris.includes(redirectUri)) {
    return errorPage('redirect_uri가 등록된 값과 일치하지 않습니다.')
  }

  // 이후 오류는 redirect_uri 로 OAuth 에러 반환
  if (responseType !== 'code') return redirectError(redirectUri, 'unsupported_response_type', state)
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return redirectError(redirectUri, 'invalid_request', state)
  }

  // 로그인 확인 — 비로그인 시 구글 로그인으로 보냈다가 이 URL 로 복귀
  const session = await getSupabaseServer()
  const { data: userData } = await session.auth.getUser()
  const user = userData?.user
  if (!user) {
    const selfPath = `/api/oauth/authorize?${p.toString()}`
    return NextResponse.redirect(`${BASE}/login?next=${encodeURIComponent(selfPath)}`)
  }

  // 1회용 authorization code 발급 (해시 저장)
  const code = randomToken(32)
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString()
  const { error } = await admin.from('oauth_codes').insert({
    code_hash: sha256(code),
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    resource,
    scope,
    expires_at: expiresAt,
  })
  if (error) return redirectError(redirectUri, 'server_error', state)

  const out = new URL(redirectUri)
  out.searchParams.set('code', code)
  if (state) out.searchParams.set('state', state)
  return NextResponse.redirect(out.toString())
}
