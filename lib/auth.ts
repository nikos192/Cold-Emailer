import { createHash, randomBytes } from 'crypto'

export const COOKIE_NAME = 'outreach_auth'

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function getExpectedCookieValue(): string {
  const password = process.env.ADMIN_PASSWORD ?? ''
  return createHash('sha256').update(`velory-session-${password}`).digest('hex')
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  return cookieValue === getExpectedCookieValue()
}
