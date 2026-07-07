import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = await createRouteHandlerClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('oauth_tokens').delete().eq('user_id', user.id)
    await supabase.from('subscriptions').delete().eq('user_id', user.id)
    await supabase.auth.signOut()
  }

  const url = new URL('/', request.url)
  const response = NextResponse.redirect(url)
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')

  return response
}
