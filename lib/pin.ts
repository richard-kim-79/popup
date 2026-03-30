import bcrypt from 'bcryptjs'

const COST_FACTOR = 12

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, COST_FACTOR)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}
