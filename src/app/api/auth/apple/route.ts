import { NextResponse } from 'next/server'
import { attachStateCookie, createOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const clientId = process.env.APPLE_CLIENT_ID
  const redirectUri = process.env.APPLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Apple OAuth not configured' },
      { status: 500 }
    )
  }

  const { state, nonce } = createOAuthState('apple')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'name email',
    state,
  })

  return attachStateCookie(
    NextResponse.redirect(
      `https://appleid.apple.com/auth/authorize?${params.toString()}`
    ),
    nonce
  )
}
