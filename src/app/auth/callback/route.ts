import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { ConfidentialClientApplication } from '@azure/msal-node'
import jwt from 'jsonwebtoken'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { encryptToken } from '@/lib/crypto'
import { OAUTH_STATE_COOKIE, verifyOAuthState, type OAuthProvider } from '@/lib/oauth-state'

interface ProviderTokens {
  provider: OAuthProvider
  supabaseProvider: 'google' | 'azure' | 'apple'
  idToken: string
  accessToken: string
  refreshToken: string
  scopes: string
  expiresAt: Date
}

async function exchangeGoogle(code: string): Promise<ProviderTokens> {
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  )

  const { tokens } = await oauth.getToken(code)
  if (!tokens.access_token || !tokens.id_token) {
    throw new Error('Missing tokens in Google response')
  }

  return {
    provider: 'google',
    supabaseProvider: 'google',
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    scopes: 'gmail.metadata',
    // expiry_date is already an absolute epoch-ms timestamp
    expiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600_000),
  }
}

async function exchangeMicrosoft(code: string): Promise<ProviderTokens> {
  const msal = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    },
  })

  const result = await msal.acquireTokenByCode({
    code,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    scopes: ['Mail.Read', 'User.Read', 'offline_access'],
  })

  if (!result?.accessToken || !result.idToken) {
    throw new Error('Missing tokens in Microsoft response')
  }

  // msal-node does not expose the refresh token on the result; it lives in
  // the serialized token cache.
  const cache = JSON.parse(msal.getTokenCache().serialize()) as {
    RefreshToken?: Record<string, { secret?: string }>
  }
  const refreshEntry = Object.values(cache.RefreshToken ?? {})[0]

  return {
    provider: 'microsoft',
    supabaseProvider: 'azure',
    idToken: result.idToken,
    accessToken: result.accessToken,
    refreshToken: refreshEntry?.secret || '',
    scopes: 'Mail.Read',
    expiresAt: result.expiresOn ?? new Date(Date.now() + 3600_000),
  }
}

async function exchangeApple(code: string): Promise<ProviderTokens> {
  const clientId = process.env.APPLE_CLIENT_ID!

  const clientSecret = jwt.sign(
    {
      iss: process.env.APPLE_TEAM_ID!,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 180,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', keyid: process.env.APPLE_KEY_ID! }
  )

  const res = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.APPLE_REDIRECT_URI!,
    }),
  })

  const data = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }

  if (!res.ok || !data.access_token || !data.id_token) {
    throw new Error('Missing tokens in Apple response')
  }

  return {
    provider: 'apple',
    supabaseProvider: 'apple',
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    scopes: 'email',
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  }
}

const exchangers: Record<OAuthProvider, (code: string) => Promise<ProviderTokens>> = {
  google: exchangeGoogle,
  microsoft: exchangeMicrosoft,
  apple: exchangeApple,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const state = searchParams.get('state')
  const cookieNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/?error=${reason}`, request.url))
    response.cookies.delete(OAUTH_STATE_COOKIE)
    return response
  }

  if (errorParam) return fail('oauth_denied')
  if (!code) return fail('no_code')

  const provider = verifyOAuthState(state, cookieNonce)
  if (!provider) return fail('invalid_state')

  let tokens: ProviderTokens
  try {
    tokens = await exchangers[provider](code)
  } catch (error) {
    console.error(`${provider} token exchange failed:`, error)
    return fail('token_exchange_failed')
  }

  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: tokens.supabaseProvider,
    token: tokens.idToken,
  })
  if (signInError) {
    console.error('Supabase sign-in failed:', signInError)
    return fail('auth_failed')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('auth_failed')

  const { error: tokenError } = await supabase.from('oauth_tokens').upsert(
    {
      user_id: user.id,
      provider: tokens.provider,
      encrypted_access_token: encryptToken(tokens.accessToken),
      encrypted_refresh_token: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : '',
      scopes: tokens.scopes,
      expires_at: tokens.expiresAt.toISOString(),
    },
    { onConflict: 'user_id,provider' }
  )
  if (tokenError) {
    console.error('Failed to store OAuth tokens:', tokenError)
    return fail('token_storage_failed')
  }

  // Carry the session cookies written during signInWithIdToken onto the
  // redirect, or the user lands on /scan logged out.
  const response = NextResponse.redirect(new URL('/scan', request.url))
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie)
  }
  response.cookies.delete(OAUTH_STATE_COOKIE)
  return response
}
