// ============================================================
// CORS Headers Helper — v1 API 라우트용
// ============================================================

import { NextResponse } from 'next/server'

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization'

/** CORS 헤더를 응답에 추가 */
export function withCors<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

/** OPTIONS preflight 응답 */
export function corsPreflightResponse(): NextResponse {
  return withCors(
    new NextResponse(null, { status: 204 }),
  )
}
