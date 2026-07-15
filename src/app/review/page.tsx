'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SubscriptionList from '@/components/subscription-list'
import DonateLink from '@/components/donate-link'
import type { SubscriptionGroup } from '@/types'

interface ProgressState {
  completed: number
  total: number
  current: string
}

export default function ReviewPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<SubscriptionGroup[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [actionError, setActionError] = useState('')
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('subscriptions')
    if (stored) {
      const parsed: SubscriptionGroup[] = JSON.parse(stored)
      // sessionStorage is client-only external state; reading it in an effect
      // (not a lazy initializer) avoids an SSR hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubscriptions(parsed)
      // Unsubscribe is destructive from the user's perspective. Require an
      // explicit opt-in for every sender rather than preselecting the lot.
      setSelected(new Set())
    } else {
      router.replace('/scan')
    }
  }, [router])

  const revokeAndLogout = useCallback(async () => {
    setRevoking(true)
    try {
      await fetch('/api/auth/revoke', { method: 'POST' })
    } catch {
      // Best-effort revoke
    }
    sessionStorage.clear()
    router.push('/')
  }, [router])

  const toggleAll = useCallback(() => {
    if (running) return
    if (selected.size === subscriptions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(subscriptions.map((s) => s.id)))
    }
  }, [running, selected, subscriptions])

  const toggleOne = useCallback((id: string) => {
    if (running) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [running])

  const runUnsubscribe = useCallback(async () => {
    if (running || selected.size === 0) return
    setRunning(true)
    setActionError('')
    const chosen = subscriptions.filter((subscription) => selected.has(subscription.id))
    const results: Array<Record<string, unknown>> = []
    setProgress({ completed: 0, total: chosen.length, current: chosen[0]?.senderName || '' })

    try {
      for (let index = 0; index < chosen.length; index++) {
        const subscription = chosen[index]
        setProgress({ completed: index, total: chosen.length, current: subscription.senderName })

        try {
          const response = await fetch('/api/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionIds: [subscription.id] }),
            signal: AbortSignal.timeout(30_000),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data.results?.[0]) {
            throw new Error(data.error || `Request failed (${response.status})`)
          }
          results.push(data.results[0])
        } catch (error) {
          results.push({
            subscriptionId: subscription.id,
            tierUsed: subscription.detectedMethod?.tier || 1,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Request failed',
          })
        }

        setProgress({
          completed: index + 1,
          total: chosen.length,
          current: subscription.senderName,
        })
      }

      sessionStorage.setItem('results', JSON.stringify(results))
      sessionStorage.setItem(
        'subscriptionNames',
        JSON.stringify(
          subscriptions
            .filter((s) => selected.has(s.id))
            .map((s) => ({ id: s.id, name: s.senderName }))
        )
      )

      setRunning(false)
      router.push('/results')
    } catch (err) {
      console.error('Unsubscribe failed:', err)
      setActionError(err instanceof Error ? err.message : 'Unsubscribe failed')
      setRunning(false)
    }
  }, [running, selected, subscriptions, router])

  if (subscriptions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-neutral-400">No subscriptions found.</p>
      </main>
    )
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Your Subscriptions</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {subscriptions.length} mailing lists found. Select only the
              senders you want to leave.
            </p>
          </div>
          <button
            onClick={toggleAll}
            disabled={running}
            className="shrink-0 whitespace-nowrap py-1 text-sm text-neutral-400 hover:text-neutral-100 underline underline-offset-2 transition-colors"
          >
            {selected.size === subscriptions.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <SubscriptionList
          subscriptions={subscriptions}
          selected={selected}
          onToggle={toggleOne}
        />

        <div className="sticky bottom-0 border-t border-white/10 bg-background pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {running && progress && (
            <div className="mb-3 space-y-2" role="status" aria-live="polite">
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate">Processing {progress.current}</span>
                <span className="shrink-0 font-medium">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <progress
                className="h-2 w-full"
                value={progress.completed}
                max={progress.total}
              />
            </div>
          )}
          {actionError && (
            <p className="mb-3 text-sm text-red-400" role="alert">
              {actionError}
            </p>
          )}
          <button
            onClick={runUnsubscribe}
            disabled={running || selected.size === 0}
            className="w-full rounded-xl bg-white px-6 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running
              ? `Unsubscribing ${progress?.completed || 0} of ${progress?.total || selected.size}…`
              : `Unsubscribe from ${selected.size} sender${selected.size !== 1 ? 's' : ''}`}
          </button>

          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={revokeAndLogout}
              disabled={revoking}
              className="text-sm text-neutral-500 hover:text-red-400 underline underline-offset-2 disabled:opacity-50 transition-colors"
            >
              {revoking ? 'Revoking…' : 'Revoke Access & Log Out'}
            </button>
            <DonateLink label="Found this useful? Buy me a coffee" />
          </div>
        </div>
      </div>
    </main>
  )
}
