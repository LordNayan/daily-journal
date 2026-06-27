import { SignJWT, jwtVerify } from 'jose'
import type { Session } from '@/types'

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-secret-daily-journal-change-in-production'
  )

export async function signSession(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export const COOKIE_NAME = 'dj-session'
