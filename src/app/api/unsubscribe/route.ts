import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runUnsubscribe } from '@/lib/engine/unsubscribe-engine'
import type { UnsubscribeMethod } from '@/types'

export async function POST(request: NextRequest) {
  const { supabase, supabaseResponse } = await createRouteHandlerClient(request)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { subscriptionIds } = body as { subscriptionIds: string[] }

  if (!subscriptionIds?.length) {
    return NextResponse.json(
      { error: 'No subscription IDs provided' },
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

    if (sub.detected_tier && sub.detected_method) {
      const tierMatch = sub.detected_method.match(/^(\d):(.+)/)
      if (tierMatch) {
        method = {
          tier: parseInt(tierMatch[1]) as 1 | 2 | 3,
          description: tierMatch[2],
        }
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

    const result = await runUnsubscribe(method, sub.from_address)

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
  const { supabase, supabaseResponse } = await createRouteHandlerClient(request)

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
