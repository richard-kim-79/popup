import { NextResponse } from 'next/server'
import { withCors, corsPreflightResponse } from '@/lib/cors'

export function OPTIONS() {
  return corsPreflightResponse()
}

export function GET() {
  return withCors(
    NextResponse.json({
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
    }),
  )
}
