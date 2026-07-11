import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { GoogleMailboxAdapter } from '@/lib/providers/google-adapter'
import { MicrosoftMailboxAdapter } from '@/lib/providers/microsoft-adapter'
import { ImapMailboxAdapter, type ImapConnection } from '@/lib/providers/imap-adapter'
import type { MailboxProvider } from '@/lib/providers/mailbox-provider'
import { SubscriptionScanner } from '@/lib/scan/scanner'
import { decryptToken, encryptToken } from '@/lib/crypto'
import type { SubscriptionGroup } from '@/types'

const DEFAULT_RANGE_MONTHS = 6
const MAX_RANGE_MONTHS = 24

// Grouping can produce several groups for one sender (list-id key vs
// from-address key), but subscriptions are unique per (user, from_address) —
// merge them before upserting or Postgres rejects the batch.
function dedupeByFromAddress(subscriptions: SubscriptionGroup[]): SubscriptionGroup[] {
  const byFrom = new Map<string, SubscriptionGroup>()
  for (const sub of subscriptions) {
    const existing = byFrom.get(sub.fromAddress)
    if (!existing) {
      byFrom.set(sub.fromAddress, { ...sub })
      continue
    }
    existing.messageCount += sub.messageCount
    if (sub.lastSeen > existing.lastSeen) existing.lastSeen = sub.lastSeen
    if (!existing.detectedMethod && sub.detectedMethod) {
      existing.detectedMethod = sub.detectedMethod
    }
  }
  return [...byFrom.values()]
}

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const imap = parseImapConnection(body.imap)

  const { data: tokenData } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!tokenData && !imap) {
    return NextResponse.json(
      {
        error: 'Connect your mailbox to scan it.',
        code: 'MAILBOX_CREDENTIALS_REQUIRED',
        email: user.email || '',
      },
      { status: 400 }
    )
  }

  if (
    tokenData?.provider === 'google' &&
    !tokenData.scopes?.split(/\s+/).includes('gmail.readonly')
  ) {
    return NextResponse.json(
      {
        error: 'Google permission update required. Reconnect your inbox to continue.',
        code: 'GOOGLE_RECONNECT_REQUIRED',
      },
      { status: 409, headers: supabaseResponse.headers }
    )
  }

  let adapter: MailboxProvider
  if (imap) {
    adapter = new ImapMailboxAdapter(imap)
  } else {
    let accessToken: string
    let refreshToken: string
    try {
      accessToken = decryptToken(tokenData!.encrypted_access_token)
      refreshToken = tokenData!.encrypted_refresh_token
        ? decryptToken(tokenData!.encrypted_refresh_token)
        : ''
    } catch {
      return NextResponse.json(
        { error: 'Stored credentials are unreadable. Reconnect your inbox.' },
        { status: 400 }
      )
    }

    const persistRefreshed = async (refreshed: {
      accessToken: string
      refreshToken?: string
      expiryDate: number
    }) => {
      await supabase
        .from('oauth_tokens')
        .update({
          encrypted_access_token: encryptToken(refreshed.accessToken),
          ...(refreshed.refreshToken
            ? { encrypted_refresh_token: encryptToken(refreshed.refreshToken) }
            : {}),
          expires_at: new Date(refreshed.expiryDate).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData!.id)
    }

    if (tokenData!.provider === 'google') {
      adapter = new GoogleMailboxAdapter(
        {
          accessToken,
          refreshToken,
          expiryDate: new Date(tokenData!.expires_at).getTime(),
        },
        persistRefreshed
      )
    } else if (tokenData!.provider === 'microsoft') {
      adapter = new MicrosoftMailboxAdapter(
        {
          accessToken,
          refreshToken,
          expiryDate: new Date(tokenData!.expires_at).getTime(),
        },
        persistRefreshed
      )
    } else {
      return NextResponse.json(
        { error: `Unsupported mailbox provider: ${tokenData!.provider}` },
        { status: 400 }
      )
    }
  }

  const requested = Number(body.rangeMonths)
  const rangeMonths =
    Number.isInteger(requested) && requested >= 1 && requested <= MAX_RANGE_MONTHS
      ? requested
      : DEFAULT_RANGE_MONTHS

  try {
    const result = await new SubscriptionScanner(adapter).scan(rangeMonths)
    const deduped = dedupeByFromAddress(result.subscriptions)

    const subscriptionRows = deduped.map((sub) => ({
      user_id: user.id,
      sender_name: sub.senderName,
      from_address: sub.fromAddress,
      domain: sub.domain,
      list_id: sub.listId,
      message_count: sub.messageCount,
      last_seen: sub.lastSeen.toISOString(),
      detected_method: sub.detectedMethod?.description ?? null,
      detected_tier: sub.detectedMethod?.tier ?? null,
      unsubscribe_url: sub.detectedMethod?.url ?? null,
      unsubscribe_mailto: sub.detectedMethod?.mailto ?? null,
    }))

    let subscriptions: SubscriptionGroup[] = []

    // Remove rows created by the earlier unsafe classifier. Rows without an
    // unsubscribe method must never remain actionable or selectable.
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id)
      .is('detected_tier', null)

    if (subscriptionRows.length > 0) {
      // .select() returns the persisted rows so the client gets real DB ids —
      // the ids the unsubscribe endpoint looks up.
      const { data: saved, error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(subscriptionRows, { onConflict: 'user_id,from_address' })
        .select()

      if (upsertError || !saved) {
        console.error('Failed to save subscriptions:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save scan results' },
          { status: 500, headers: supabaseResponse.headers }
        )
      }

      subscriptions = saved
        .map((row) => ({
          id: row.id,
          senderName: row.sender_name,
          fromAddress: row.from_address,
          domain: row.domain,
          listId: row.list_id,
          messageCount: row.message_count,
          lastSeen: new Date(row.last_seen),
          detectedMethod: row.detected_tier
            ? {
                tier: row.detected_tier,
                description: row.detected_method || '',
                url: row.unsubscribe_url || undefined,
                mailto: row.unsubscribe_mailto || undefined,
              }
            : null,
        }))
        .sort((a, b) => b.messageCount - a.messageCount)
    }

    return NextResponse.json(
      { subscriptions, totalMessages: result.totalMessages },
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

function parseImapConnection(value: unknown): ImapConnection | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const host = typeof input.host === 'string' ? input.host.trim() : ''
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const port = Number(input.port)
  if (
    !host || host.length > 253 || !/^[a-z0-9.-]+$/i.test(host) ||
    !username || username.length > 320 || !password || password.length > 1024 ||
    !Number.isInteger(port) || port < 1 || port > 65535
  ) {
    return null
  }
  return { host, username, password, port, secure: input.secure !== false }
}
