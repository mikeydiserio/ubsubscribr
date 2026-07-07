import { NextResponse } from 'next/server'

const SCOPES = ['Mail.Read', 'User.Read', 'offline_access'].join(' ')

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Microsoft OAuth not configured' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_mode: 'query',
    state: 'microsoft',
    prompt: 'select_account',
  })

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  )
}
