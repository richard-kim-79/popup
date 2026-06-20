import { NextResponse } from 'next/server'
import { protectedResourceMetadata } from '@/lib/oauth'

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
