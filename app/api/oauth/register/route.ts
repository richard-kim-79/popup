// ============================================================
// OAuth 2.0 Dynamic Client Registration (RFC 7591) — public client
// POST /api/oauth/register  { redirect_uris: string[], client_name?: string }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { randomToken } from '@/lib/oauth'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/** redirect_uri 허용: https 또는 localhost/127.0.0.1 (포트 무관) */
function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri)
    if (u.protocol === 'https:') return true
    if ((u.protocol === 'http:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true
    return false
  } catch {
    return false
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { redirect_uris?: unknown; client_name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400, headers: CORS })
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === 'string')
    : []

  if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirect)) {
    return NextResponse.json(
      { error: 'invalid_redirect_uri', error_description: 'redirect_uris must be https or localhost' },
      { status: 400, headers: CORS },
    )
  }

  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 120) : null
  const clientId = `mcp_${randomToken(16)}`

  const admin = getSupabaseAdmin()
  const { error } = await admin.from('oauth_clients').insert({
    client_id: clientId,
    redirect_uris: redirectUris,
    client_name: clientName,
  })

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: CORS })
  }

  return NextResponse.json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      client_name: clientName,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201, headers: CORS },
  )
}
