// ============================================================
// OAuth 2.1 Token Endpoint — authorization_code (PKCE) + refresh_token
// POST /api/oauth/token  (application/x-www-form-urlencoded 또는 JSON)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  sha256, randomToken, verifyPkceS256,
  ACCESS_TTL_SEC, REFRESH_TTL_SEC, MCP_RESOURCE,
} from '@/lib/oauth'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function err(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status, headers: CORS })
}

async function readParams(req: NextRequest): Promise<URLSearchParams> {
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    const j = await req.json().catch(() => ({})) as Record<string, unknown>
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(j)) if (v != null) sp.set(k, String(v))
    return sp
  }
  const text = await req.text()
  return new URLSearchParams(text)
}

type TokenRow = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string | null
}

async function issueTokens(
  admin: ReturnType<typeof getSupabaseAdmin>,
  opts: { userId: string; clientId: string; audience: string | null; scope: string | null },
): Promise<TokenRow | null> {
  const access = randomToken(32)
  const refresh = randomToken(32)
  const now = Date.now()
  const { error } = await admin.from('oauth_tokens').insert({
    access_hash: sha256(access),
    refresh_hash: sha256(refresh),
    user_id: opts.userId,
    client_id: opts.clientId,
    audience: opts.audience,
    scope: opts.scope,
    access_expires_at: new Date(now + ACCESS_TTL_SEC * 1000).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TTL_SEC * 1000).toISOString(),
  })
  if (error) return null
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SEC,
    refresh_token: refresh,
    scope: opts.scope,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const p = await readParams(req)
  const grantType = p.get('grant_type')
  const admin = getSupabaseAdmin()

  // ── authorization_code ──────────────────────────────────────
  if (grantType === 'authorization_code') {
    const code = p.get('code')
    const redirectUri = p.get('redirect_uri')
    const codeVerifier = p.get('code_verifier')
    const clientId = p.get('client_id')
    const resource = p.get('resource')

    if (!code || !redirectUri || !codeVerifier) return err('invalid_request')

    const { data: row } = await admin
      .from('oauth_codes')
      .select('*')
      .eq('code_hash', sha256(code))
      .maybeSingle()

    if (!row || row.used) return err('invalid_grant')
    if (new Date(row.expires_at) < new Date()) return err('invalid_grant')
    if (clientId && clientId !== row.client_id) return err('invalid_grant')
    if (redirectUri !== row.redirect_uri) return err('invalid_grant')
    if (row.resource && resource && resource !== row.resource) return err('invalid_target')
    if (!verifyPkceS256(codeVerifier, row.code_challenge)) return err('invalid_grant')

    // code 소비 (재사용 방지)
    await admin.from('oauth_codes').update({ used: true }).eq('code_hash', row.code_hash)

    const tokens = await issueTokens(admin, {
      userId: row.user_id,
      clientId: row.client_id,
      audience: row.resource ?? MCP_RESOURCE,
      scope: row.scope,
    })
    if (!tokens) return err('server_error', 500)
    return NextResponse.json(tokens, { headers: CORS })
  }

  // ── refresh_token (회전) ────────────────────────────────────
  if (grantType === 'refresh_token') {
    const refreshToken = p.get('refresh_token')
    if (!refreshToken) return err('invalid_request')

    const { data: row } = await admin
      .from('oauth_tokens')
      .select('*')
      .eq('refresh_hash', sha256(refreshToken))
      .is('revoked_at', null)
      .maybeSingle()

    if (!row) return err('invalid_grant')
    if (row.refresh_expires_at && new Date(row.refresh_expires_at) < new Date()) return err('invalid_grant')

    // 기존 토큰 폐기 후 새로 발급 (refresh 회전)
    await admin.from('oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', row.id)

    const tokens = await issueTokens(admin, {
      userId: row.user_id,
      clientId: row.client_id,
      audience: row.audience,
      scope: row.scope,
    })
    if (!tokens) return err('server_error', 500)
    return NextResponse.json(tokens, { headers: CORS })
  }

  return err('unsupported_grant_type')
}
