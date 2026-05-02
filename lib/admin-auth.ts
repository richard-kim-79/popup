import { SignJWT, jwtVerify } from 'jose'

// Node.js crypto를 import하면 Edge Runtime(미들웨어)에서 충돌이 발생하므로
// 순수 JS로 timing-safe 비교를 구현합니다 (동일한 보안 수준).
function timingSafeCompare(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return result === 0
}

export const ADMIN_COOKIE = 'admin_session'

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.ADMIN_SECRET ?? '')
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export function verifyAdminPassword(input: string): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? '').trim()
  return timingSafeCompare(input.trim(), expected)
}
