'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ResultsView from '@/components/results-view'
import type { UnsubscribeResult } from '@/types'

interface NamedResult extends UnsubscribeResult {
  senderName: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<NamedResult[]>([])
  const [loaded, setLoaded] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    const storedResults = sessionStorage.getItem('results')
    const storedNames = sessionStorage.getItem('subscriptionNames')

    if (!storedResults || !storedNames) {
      router.replace('/scan')
      return
    }

    const parsedResults: UnsubscribeResult[] = JSON.parse(storedResults)
    const names: { id: string; name: string }[] = JSON.parse(storedNames)

    const nameMap = new Map(names.map((n) => [n.id, n.name]))
    const named: NamedResult[] = parsedResults.map((r) => ({
      ...r,
      senderName: nameMap.get(r.subscriptionId) || 'Unknown',
    }))

    // sessionStorage is client-only external state; reading it in an effect
    // (not a lazy initializer) avoids an SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResults(named)
    setLoaded(true)
  }, [router])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' })
    } catch {
      // Best-effort disconnect
    }
    sessionStorage.clear()
    router.push('/')
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      await fetch('/api/auth/revoke', { method: 'POST' })
    } catch {
      // Best-effort revoke
    }
    sessionStorage.clear()
    router.push('/')
  }

  if (!loaded) {
    return null
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="space-y-8">
        <ResultsView results={results} />

        <div className="text-center space-y-4 pt-8 border-t border-white/10">
          <p className="text-sm text-neutral-400">
            When you&apos;re done, revoke access so this app can no longer see your
            inbox. Your scan results are saved to your account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-colors"
            >
              {revoking ? 'Revoking…' : 'Revoke Access & Log Out'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm text-neutral-500 hover:text-red-400 underline underline-offset-2 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? 'Disconnecting…' : 'Delete Everything'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
