import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { GoogleMailboxAdapter } from '@/lib/providers/google-adapter'
import { decryptToken } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Revoke the provider grant, not just our copy of it — the landing page
    // promises "revoke our access and everything is erased".
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
        // Best-effort: unreadable or already-revoked tokens still get deleted
      }
    }

    await supabase.from('oauth_tokens').delete().eq('user_id', user.id)
    // unsubscribe_jobs rows cascade with their subscriptions
    await supabase.from('subscriptions').delete().eq('user_id', user.id)
    await supabase.auth.signOut()
  }

  // Carry the cookie mutations from signOut onto the redirect.
  const response = NextResponse.redirect(new URL('/', request.url))
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie)
  }
  return response
}
