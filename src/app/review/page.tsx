'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SubscriptionList from '@/components/subscription-list'
import type { SubscriptionGroup } from '@/types'

export default function ReviewPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<SubscriptionGroup[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('subscriptions')
    if (stored) {
      const parsed: SubscriptionGroup[] = JSON.parse(stored)
      // sessionStorage is client-only external state; reading it in an effect
      // (not a lazy initializer) avoids an SSR hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubscriptions(parsed)
      setSelected(new Set(parsed.map((s) => s.id)))
    } else {
      router.replace('/scan')
    }
  }, [router])

  const toggleAll = useCallback(() => {
    if (selected.size === subscriptions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(subscriptions.map((s) => s.id)))
    }
  }, [selected, subscriptions])

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const runUnsubscribe = useCallback(async () => {
    setRunning(true)
    const ids = Array.from(selected)

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: ids }),
      })

      if (!response.ok) {
        throw new Error('Unsubscribe request failed')
      }

      const data = await response.json()

      sessionStorage.setItem('results', JSON.stringify(data.results))
      sessionStorage.setItem(
        'subscriptionNames',
        JSON.stringify(
          subscriptions
            .filter((s) => selected.has(s.id))
            .map((s) => ({ id: s.id, name: s.senderName }))
        )
      )

      router.push('/results')
    } catch (err) {
      console.error('Unsubscribe failed:', err)
      setRunning(false)
    }
  }, [selected, subscriptions, router])

  if (subscriptions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-gray-500">No subscriptions found.</p>
      </main>
    )
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Subscriptions</h1>
            <p className="text-sm text-gray-500 mt-1">
              {subscriptions.length} mailing lists found. Uncheck any you want
              to keep.
            </p>
          </div>
          <button
            onClick={toggleAll}
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 underline underline-offset-2"
          >
            {selected.size === subscriptions.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <SubscriptionList
          subscriptions={subscriptions}
          selected={selected}
          onToggle={toggleOne}
        />

        <div className="sticky bottom-0 bg-white dark:bg-black py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={runUnsubscribe}
            disabled={running || selected.size === 0}
            className="w-full rounded-xl bg-neutral-900 dark:bg-white px-6 py-3 text-base font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running
              ? 'Unsubscribing…'
              : `Unsubscribe from ${selected.size} sender${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </main>
  )
}
