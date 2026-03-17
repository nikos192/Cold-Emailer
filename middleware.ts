import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME, getExpectedCookieValue } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths
  if (pathname === '/' || pathname === '/api/auth') {
    return NextResponse.next()
  }

  // Protect /dashboard and all /api routes except /api/auth
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api/')

  if (!isProtected) return NextResponse.next()

  const cookie = request.cookies.get(COOKIE_NAME)?.value
  const expected = getExpectedCookieValue()

  if (cookie !== expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
