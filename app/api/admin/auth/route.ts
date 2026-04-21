import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken, verifyAdminPassword, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { password } = await req.json() as { password?: string }

  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const token = await signAdminToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return res
}
