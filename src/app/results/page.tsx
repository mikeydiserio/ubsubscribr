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

  if (!loaded) {
    return null
  }

  return (
    <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="space-y-8">
        <ResultsView results={results} />

        <div className="text-center space-y-4 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-gray-500">
            Your scan results are stored temporarily. You can disconnect your
            inbox at any time.
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-sm text-gray-400 hover:text-red-500 underline underline-offset-2 disabled:opacity-50 transition-colors"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect & Clear Data'}
          </button>
        </div>
      </div>
    </main>
  )
}
