import bcrypt from 'bcryptjs'

const COST_FACTOR = 12

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, COST_FACTOR)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * pin_hash 컬럼 채움용 — PIN 기능은 제거됐지만 컬럼은 NOT NULL 이므로
 * 임의 6자리 PIN을 해시해 넣는다(사용자에게 노출되지 않음, 편집은 토큰/로그인으로).
 */
export async function randomPinHash(): Promise<string> {
  return hashPin(String(Math.floor(100000 + Math.random() * 900000)))
}
