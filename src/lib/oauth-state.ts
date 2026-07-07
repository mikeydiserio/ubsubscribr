import { randomBytes } from 'node:crypto'
import type { NextResponse } from 'next/server'

// CSRF protection for the OAuth flows: each start route generates a random
// nonce, sends `provider.nonce` as the OAuth `state`, and stores the nonce in
// an HttpOnly cookie. The callback accepts the code only if both match.

export const OAUTH_STATE_COOKIE = 'oauth_state'

export type OAuthProvider = 'google' | 'microsoft' | 'apple'

export function createOAuthState(provider: OAuthProvider): {
  state: string
  nonce: string
} {
  const nonce = randomBytes(16).toString('base64url')
  return { state: `${provider}.${nonce}`, nonce }
}

export function attachStateCookie<T extends NextResponse>(
  response: T,
  nonce: string
): T {
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}

export function verifyOAuthState(
  state: string | null,
  cookieNonce: string | undefined
): OAuthProvider | null {
  if (!state || !cookieNonce) return null
  const dot = state.indexOf('.')
  if (dot === -1) return null
  const provider = state.slice(0, dot)
  const nonce = state.slice(dot + 1)
  if (nonce !== cookieNonce) return null
  if (provider !== 'google' && provider !== 'microsoft' && provider !== 'apple') {
    return null
  }
  return provider
}
