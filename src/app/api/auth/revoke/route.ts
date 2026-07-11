import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { GoogleMailboxAdapter } from '@/lib/providers/google-adapter'
import { decryptToken } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('provider, encrypted_access_token, encrypted_refresh_token, expires_at')
      .eq('user_id', user.id)

    for (const token of tokens ?? []) {
      if (token.provider !== 'google') continue
      try {
        const adapter = new GoogleMailboxAdapter({
          accessToken: decryptToken(token.encrypted_access_token),
          refreshToken: token.encrypted_refresh_token
            ? decryptToken(token.encrypted_refresh_token)
            : '',
          expiryDate: new Date(token.expires_at).getTime(),
        })
        await adapter.revokeAccess()
      } catch {
      }
    }

    await supabase.from('oauth_tokens').delete().eq('user_id', user.id)
    await supabase.auth.signOut()
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie)
  }
  return response
}
