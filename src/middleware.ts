import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login']
const ADMIN_PATHS = ['/admin', '/api/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const session = token ? await verifySession(token) : null

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin routes: only cto and admin roles
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (session.role !== 'cto' && session.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/journal', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
}
