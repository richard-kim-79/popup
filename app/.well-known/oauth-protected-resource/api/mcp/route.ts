import { NextResponse } from 'next/server'
import { protectedResourceMetadata } from '@/lib/oauth'

// 리소스 경로 접미 변형: /.well-known/oauth-protected-resource/api/mcp
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export function GET(): NextResponse {
  return NextResponse.json(protectedResourceMetadata(), { headers: CORS })
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS })
}
