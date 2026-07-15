'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScanProgress from '@/components/scan-progress'
import { takeImapCredentials } from '@/lib/imap-session'
import type { SubscriptionGroup } from '@/types'

type ScanState = 'connecting' | 'scanning' | 'done' | 'error'

interface ImapForm {
  host: string
  port: string
  secure: boolean
  username: string
  password: string
}

export default function ScanPage() {
  const router = useRouter()
  // The page always begins scanning immediately, so mount straight into the
  // scanning state — the effect below only performs the async work.
  const [state, setState] = useState<ScanState>('scanning')
  const [progress, setProgress] = useState(10)
  const [subscriptions, setSubscriptions] = useState<SubscriptionGroup[]>([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [error, setError] = useState('')
  const [reconnectGoogle, setReconnectGoogle] = useState(false)
  // Credentials handed over from /connect seed the form directly; the store
  // is cleared on take, so a reload falls back to the manual form.
  const [imap, setImap] = useState<ImapForm>(
    () =>
      takeImapCredentials() ?? {
        host: '',
        port: '993',
        secure: true,
        username: '',
        password: '',
      }
  )

  const runScan = useCallback(async (imapConnection?: ImapForm) => {
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
        if (data.code === 'IMAP_SCAN_FAILED') {
          setImap((current) => ({ ...current, password: '' }))
          setError(data.detail || data.error || 'Mailbox connection failed')
          setState('connecting')
          setProgress(0)
          return
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

  // Synchronous state reset + async scan, for retry/submit event handlers.
  const startScan = useCallback(
    (imapConnection?: ImapForm) => {
      setState('scanning')
      setProgress(10)
      runScan(imapConnection)
    },
    [runScan]
  )

  const scanStarted = useRef(false)
  useEffect(() => {
    // Guard against StrictMode double-invoke kicking off two inbox scans
    if (scanStarted.current) return
    scanStarted.current = true
    // A non-empty password can only come from the /connect handoff.
    runScan(imap.password ? imap : undefined)
  }, [imap, runScan])

  const handleReview = useCallback(() => {
    sessionStorage.setItem('subscriptions', JSON.stringify(subscriptions))
    router.push('/review')
  }, [subscriptions, router])

  if (state === 'error') {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-400">
            Scan Failed
          </h2>
          <p className="text-neutral-400">{error}</p>
          {reconnectGoogle ? (
            <button
              onClick={async () => {
                await fetch('/api/auth/disconnect', { method: 'POST' })
                window.location.href = '/api/auth/google'
              }}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              Reconnect Google
            </button>
          ) : (
            <button
              onClick={() => startScan()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
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
          className="max-w-md w-full space-y-5 rounded-2xl border border-white/10 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            startScan(imap)
          }}
        >
          <div>
            <h2 className="text-2xl font-bold">Connect your mailbox</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Use an app-specific password when your mail provider supports one.
              These credentials are used for this scan only and are never stored.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <label className="block text-sm font-medium">
            Email / username
            <input
              required
              autoComplete="username"
              value={imap.username}
              onChange={(event) => setImap({ ...imap, username: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2"
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
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            IMAP server
            <input
              required
              placeholder="imap.example.com"
              value={imap.host}
              onChange={(event) => setImap({ ...imap, host: event.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Port
              <input
                required
                type="number"
                min="1"
                max="65535"
                value={imap.port}
                onChange={(event) => setImap({ ...imap, port: event.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2"
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
            className="w-full rounded-xl bg-white px-5 py-3 font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
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
          <p className="text-sm text-neutral-400">
            Scanning the last 6 months of messages. This takes a few seconds.
          </p>
        )}

        {state === 'done' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6 space-y-2">
              <p className="text-3xl font-bold">{subscriptions.length}</p>
              <p className="text-sm text-neutral-400">
                mailing lists found in {totalMessages.toLocaleString()}{' '}
                messages scanned
              </p>
            </div>
            <button
              onClick={handleReview}
              className="rounded-xl bg-white px-6 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              Review Subscriptions
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
