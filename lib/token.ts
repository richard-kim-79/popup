import jwt from 'jsonwebtoken'

const SECRET = process.env.EDIT_TOKEN_SECRET!
const EXPIRES_IN = '1h'

interface EditTokenPayload {
  slug: string
  iat?: number
  exp?: number
}

export function issueEditToken(slug: string): string {
  return jwt.sign({ slug }, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyEditToken(token: string, slug: string): boolean {
  try {
    const payload = jwt.verify(token, SECRET) as EditTokenPayload
    return payload.slug === slug
  } catch {
    return false
  }
}
