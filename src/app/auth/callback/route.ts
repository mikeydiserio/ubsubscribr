import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { ConfidentialClientApplication } from '@azure/msal-node'
import jwt from 'jsonwebtoken'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
async function handleGoogleCallback(
  request: NextRequest,
  supabase: any,
  code: string
) {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri)

  let tokenResponse
  try {
    tokenResponse = await oauth.getToken(code)
  } catch {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
  }

  const tokens = tokenResponse.tokens
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL('/?error=missing_tokens', request.url))
  }

  oauth.setCredentials(tokens)
  const tokenInfo = await oauth.getTokenInfo(tokens.access_token)
  const email = tokenInfo.email || 'unknown'

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token!,
  })

  if (signInError) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    await supabase.from('users').insert({
      id: user.id,
      email,
      provider: 'google',
    })
  }

  await supabase.from('oauth_tokens').upsert(
    {
      user_id: user.id,
      provider: 'google',
      encrypted_access_token: tokens.access_token,
      encrypted_refresh_token: tokens.refresh_token || '',
      scopes: 'gmail.metadata',
      expires_at: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(new URL('/scan', request.url))
}

async function handleMicrosoftCallback(
  request: NextRequest,
  supabase: ReturnType<typeof Object>,
  code: string
) {
  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'

  const msalConfig = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  })

  let tokenResponse
  try {
    tokenResponse = await msalConfig.acquireTokenByCode({
      code,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
    })
  } catch {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
  }

  if (!tokenResponse || !tokenResponse.accessToken || !tokenResponse.idToken) {
    return NextResponse.redirect(new URL('/?error=missing_tokens', request.url))
  }

  const email = tokenResponse.account?.username || 'unknown'

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'azure',
    token: tokenResponse.idToken,
  })

  if (signInError) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    await supabase.from('users').insert({
      id: user.id,
      email,
      provider: 'microsoft',
    })
  }

  const msTokens = tokenResponse as any
  await supabase.from('oauth_tokens').upsert(
    {
      user_id: user.id,
      provider: 'microsoft',
      encrypted_access_token: msTokens.accessToken,
      encrypted_refresh_token: msTokens.refreshToken || '',
      scopes: 'Mail.Read',
      expires_at: msTokens.expiresOn
        ? new Date(msTokens.expiresOn).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(new URL('/scan', request.url))
}

async function handleAppleCallback(
  request: NextRequest,
  supabase: any,
  code: string
) {
  const clientId = process.env.APPLE_CLIENT_ID!
  const teamId = process.env.APPLE_TEAM_ID!
  const keyId = process.env.APPLE_KEY_ID!
  const privateKey = process.env.APPLE_PRIVATE_KEY!
  const redirectUri = process.env.APPLE_REDIRECT_URI!

  const clientSecret = jwt.sign(
    {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 180,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    privateKey.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', keyid: keyId }
  )

  let tokenResponse
  try {
    const res = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    tokenResponse = await res.json()
  } catch {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
  }

  if (!tokenResponse.access_token || !tokenResponse.id_token) {
    return NextResponse.redirect(new URL('/?error=missing_tokens', request.url))
  }

  const email = tokenResponse.email || 'unknown'

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: tokenResponse.id_token,
  })

  if (signInError) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    await supabase.from('users').insert({
      id: user.id,
      email,
      provider: 'apple',
    })
  }

  await supabase.from('oauth_tokens').upsert(
    {
      user_id: user.id,
      provider: 'apple',
      encrypted_access_token: tokenResponse.access_token,
      encrypted_refresh_token: tokenResponse.refresh_token || '',
      scopes: 'email',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(new URL('/scan', request.url))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const state = searchParams.get('state')

  if (errorParam) {
    return NextResponse.redirect(new URL('/?error=oauth_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  const provider = state || 'google'

  const { supabase } = await createRouteHandlerClient(request)

  switch (provider) {
    case 'microsoft':
      return handleMicrosoftCallback(request, supabase, code)
    case 'apple':
      return handleAppleCallback(request, supabase, code)
    default:
      return handleGoogleCallback(request, supabase, code)
  }
}
