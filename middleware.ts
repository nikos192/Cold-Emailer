import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME, getExpectedCookieValue } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths
  if (pathname === '/' || pathname === '/api/auth') {
    return NextResponse.next()
  }

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api/')

  if (!isProtected) return NextResponse.next()

  const cookie = request.cookies.get(COOKIE_NAME)?.value
  const expected = await getExpectedCookieValue()

  if (cookie !== expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
