import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.APPLE_CLIENT_ID
  const redirectUri = process.env.APPLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Apple OAuth not configured' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'name email',
    state: 'apple',
  })

  return NextResponse.redirect(
    `https://appleid.apple.com/auth/authorize?${params.toString()}`
  )
}
