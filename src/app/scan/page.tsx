'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScanProgress from '@/components/scan-progress'
import type { SubscriptionGroup } from '@/types'

type ScanState = 'idle' | 'connecting' | 'scanning' | 'done' | 'error'

interface ImapForm {
  host: string
  port: string
  secure: boolean
  username: string
  password: string
}

export default function ScanPage() {
  const router = useRouter()
  const [state, setState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [subscriptions, setSubscriptions] = useState<SubscriptionGroup[]>([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [error, setError] = useState('')
  const [reconnectGoogle, setReconnectGoogle] = useState(false)
  const [imap, setImap] = useState<ImapForm>({
    host: '',
    port: '993',
    secure: true,
    username: '',
    password: '',
  })

  const startScan = useCallback(async (imapConnection?: ImapForm) => {
    setState('scanning')
    setProgress(10)

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85))
    }, 1000)

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeMonths: 6,
          ...(imapConnection
            ? {
                imap: {
                  ...imapConnection,
                  port: Number(imapConnection.port),
                },
              }
            : {}),
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        if (data.code === 'MAILBOX_CREDENTIALS_REQUIRED') {
          setImap((current) => ({
            ...current,
            username: data.email || current.username,
          }))
          setState('connecting')
          setProgress(0)
          return
        }
        if (data.code === 'GOOGLE_RECONNECT_REQUIRED') {
          setReconnectGoogle(true)
        }
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

  const scanStarted = useRef(false)
  useEffect(() => {
    // Guard against StrictMode double-invoke kicking off two inbox scans
    if (scanStarted.current) return
    scanStarted.current = true
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
          {reconnectGoogle ? (
            <button
              onClick={async () => {
                await fetch('/api/auth/disconnect', { method: 'POST' })
                window.location.href = '/api/auth/google'
              }}
              className="rounded-lg bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Reconnect Google
            </button>
          ) : (
            <button
              onClick={() => startScan()}
              className="rounded-lg bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </main>
    )
  }

  if (state === 'connecting') {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <form
          className="max-w-md w-full space-y-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            startScan(imap)
          }}
        >
          <div>
            <h2 className="text-2xl font-bold">Connect your mailbox</h2>
            <p className="mt-2 text-sm text-gray-500">
              Use an app-specific password when your mail provider supports one.
              These credentials are used for this scan only and are never stored.
            </p>
          </div>

          <label className="block text-sm font-medium">
            Email / username
            <input
              required
              autoComplete="username"
              value={imap.username}
              onChange={(event) => setImap({ ...imap, username: event.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            App password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={imap.password}
              onChange={(event) => setImap({ ...imap, password: event.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            IMAP server
            <input
              required
              placeholder="imap.example.com"
              value={imap.host}
              onChange={(event) => setImap({ ...imap, host: event.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Port
              <input
                required
                type="number"
                min="1"
                max="65535"
                value={imap.port}
                onChange={(event) => setImap({ ...imap, port: event.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={imap.secure}
                onChange={(event) => setImap({ ...imap, secure: event.target.checked })}
              />
              Use TLS
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 dark:bg-white px-5 py-3 font-medium text-white dark:text-neutral-900"
          >
            Connect and scan
          </button>
        </form>
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
                mailing lists found in {totalMessages.toLocaleString()}{' '}
                messages scanned
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
