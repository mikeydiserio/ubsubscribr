import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { GoogleMailboxAdapter } from '@/lib/providers/google-adapter'
import { SubscriptionScanner } from '@/lib/scan/scanner'

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = await createRouteHandlerClient(request)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: tokenData } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenData) {
    return NextResponse.json(
      { error: 'No OAuth tokens found. Reconnect your inbox.' },
      { status: 400 }
    )
  }

  const adapter = new GoogleMailboxAdapter({
    accessToken: tokenData.encrypted_access_token,
    refreshToken: tokenData.encrypted_refresh_token,
    expiryDate: new Date(tokenData.expires_at).getTime(),
  })

  const scanner = new SubscriptionScanner(adapter)

  const body = await request.json().catch(() => ({}))
  const rangeMonths = body.rangeMonths || 6

  try {
    const result = await scanner.scan(rangeMonths)

    const subscriptionRows = result.subscriptions.map((sub) => ({
      user_id: user.id,
      sender_name: sub.senderName,
      from_address: sub.fromAddress,
      domain: sub.domain,
      list_id: sub.listId,
      message_count: sub.messageCount,
      last_seen: sub.lastSeen.toISOString(),
      detected_method: sub.detectedMethod
        ? `${sub.detectedMethod.tier}:${sub.detectedMethod.description}`
        : null,
      detected_tier: sub.detectedMethod?.tier || null,
    }))

    if (subscriptionRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(subscriptionRows, {
          onConflict: 'user_id,from_address',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error('Failed to save subscriptions:', upsertError)
      }
    }

    return NextResponse.json(
      {
        subscriptions: result.subscriptions,
        totalMessages: result.totalMessages,
      },
      { headers: supabaseResponse.headers }
    )
  } catch (error) {
    console.error('Scan failed:', error)
    return NextResponse.json(
      {
        error: 'Scan failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: supabaseResponse.headers }
    )
  }
}
