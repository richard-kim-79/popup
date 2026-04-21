import { SignJWT, jwtVerify } from 'jose'
import { timingSafeEqual } from 'crypto'

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
  const inputTrimmed = input.trim()
  try {
    return timingSafeEqual(Buffer.from(inputTrimmed), Buffer.from(expected))
  } catch {
    return false
  }
}
