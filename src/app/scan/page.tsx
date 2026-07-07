'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScanProgress from '@/components/scan-progress'
import type { SubscriptionGroup } from '@/types'

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

export default function ScanPage() {
  const router = useRouter()
  const [state, setState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [subscriptions, setSubscriptions] = useState<SubscriptionGroup[]>([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [error, setError] = useState('')

  const startScan = useCallback(async () => {
    setState('scanning')
    setProgress(10)

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85))
    }, 1000)

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rangeMonths: 6 }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || data.error || 'Scan failed')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions)
      setTotalMessages(data.totalMessages)
      setProgress(100)
      setState('done')
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Scan failed')
      setState('error')
    }
  }, [])

  useEffect(() => {
    startScan()
  }, [startScan])

  const handleReview = useCallback(() => {
    sessionStorage.setItem('subscriptions', JSON.stringify(subscriptions))
    router.push('/review')
  }, [subscriptions, router])

  if (state === 'error') {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
            Scan Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={startScan}
            className="rounded-lg bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <h2 className="text-2xl font-bold">
          {state === 'scanning' ? 'Scanning Your Inbox…' : 'Scan Complete'}
        </h2>

        <ScanProgress progress={progress} state={state} />

        {state === 'scanning' && (
          <p className="text-sm text-gray-500">
            Scanning the last 6 months of messages. This takes a few seconds.
          </p>
        )}

        {state === 'done' && (
          <div className="space-y-6">
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6 space-y-2">
              <p className="text-3xl font-bold">{subscriptions.length}</p>
              <p className="text-sm text-gray-500">
                mailing lists found across {totalMessages.toLocaleString()}{' '}
                messages
              </p>
            </div>
            <button
              onClick={handleReview}
              className="rounded-xl bg-neutral-900 dark:bg-white px-6 py-3 text-base font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Review Subscriptions
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
