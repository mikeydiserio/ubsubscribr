import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runUnsubscribe } from '@/lib/engine/unsubscribe-engine'
import type { UnsubscribeMethod } from '@/types'

const MAX_BATCH_SIZE = 200

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const subscriptionIds = body?.subscriptionIds

  if (
    !Array.isArray(subscriptionIds) ||
    subscriptionIds.length === 0 ||
    !subscriptionIds.every((id) => typeof id === 'string')
  ) {
    return NextResponse.json(
      { error: 'No subscription IDs provided' },
      { status: 400 }
    )
  }

  if (subscriptionIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Too many subscriptions in one request (max ${MAX_BATCH_SIZE})` },
      { status: 400 }
    )
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .in('id', subscriptionIds)
    .eq('user_id', user.id)

  if (!subscriptions?.length) {
    return NextResponse.json(
      { error: 'Subscriptions not found' },
      { status: 404 }
    )
  }

  const results = []

  for (const sub of subscriptions) {
    let method: UnsubscribeMethod | null = null

    if (
      (sub.detected_tier === 1 || sub.detected_tier === 2 || sub.detected_tier === 3) &&
      (sub.unsubscribe_url || sub.unsubscribe_mailto)
    ) {
      method = {
        tier: sub.detected_tier,
        description: sub.detected_method || '',
        url: sub.unsubscribe_url || undefined,
        mailto: sub.unsubscribe_mailto || undefined,
      }
    }

    if (!method) {
      results.push({
        subscriptionId: sub.id,
        tierUsed: 0,
        status: 'failed',
        error: 'No unsubscribe method detected',
      })
      continue
    }

    const result = await runUnsubscribe(method)

    await supabase.from('unsubscribe_jobs').insert({
      subscription_id: sub.id,
      tier_used: result.tierUsed,
      status: result.status,
      error: result.error || null,
      attempts: 1,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })

    results.push({ ...result, subscriptionId: sub.id })
  }

  return NextResponse.json({ results }, { headers: supabaseResponse.headers })
}

export async function GET(request: NextRequest) {
  const { supabase, supabaseResponse } = createRouteHandlerClient(request)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: jobs } = await supabase
    .from('unsubscribe_jobs')
    .select('*, subscriptions!inner(sender_name, from_address)')
    .eq('subscriptions.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ jobs }, { headers: supabaseResponse.headers })
}
