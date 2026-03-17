// Uses Web Crypto API — compatible with both Edge runtime and Node.js

export const COOKIE_NAME = 'outreach_auth'

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getExpectedCookieValue(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? ''
  return sha256(`velory-session-${password}`)
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  const expected = await getExpectedCookieValue()
  return cookieValue === expected
}
