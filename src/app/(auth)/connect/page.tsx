'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { findPreset, getOauthNudge } from '@/lib/providers/imap-presets'
import { setImapCredentials } from '@/lib/imap-session'

const inputClasses =
  'w-full rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400'
const submitClasses =
  'w-full rounded-xl bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-colors'

const OAUTH_LABELS = {
  google: { provider: 'Gmail', button: 'Google' },
  microsoft: { provider: 'Outlook', button: 'Microsoft' },
} as const

export default function ConnectPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('993')
  const [secure, setSecure] = useState(true)
  const [advancedEdited, setAdvancedEdited] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const domain = useMemo(() => email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase(), [email])
  const preset = useMemo(() => (email.includes('@') ? findPreset(email) : null), [email])
  const oauthNudge = useMemo(() => (email.includes('@') ? getOauthNudge(domain) : null), [domain, email])
  const unknownDomain = email.includes('@') && !preset && !oauthNudge

  const showAdvanced = advancedOpen || unknownDomain

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (oauthNudge) return
    setError('')
    setLoading(true)

    const resolvedHost = advancedEdited ? host : preset?.host || host
    const resolvedPort = advancedEdited ? Number(port) : preset?.port ?? Number(port)
    const resolvedSecure = advancedEdited ? secure : preset?.secure ?? secure

    try {
      const res = await fetch('/api/auth/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          host: resolvedHost,
          port: resolvedPort,
          secure: resolvedSecure,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not sign in.')
        setLoading(false)
        return
      }

      setImapCredentials({
        host: resolvedHost,
        port: String(resolvedPort),
        secure: resolvedSecure,
        username: email,
        password,
      })
      router.push('/scan')
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }, [advancedEdited, email, host, oauthNudge, password, port, preset, router, secure])

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="animate-fade-in-up w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Connect your mailbox</h1>
          <p className="text-sm text-neutral-500">
            Sign in with your email provider&apos;s details. Your password is
            only used for this session and never stored.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-describedby={preset || oauthNudge ? 'email-hint' : undefined}
              className={inputClasses}
            />
          </div>

          {preset && (
            <p id="email-hint" className="text-xs text-neutral-500 space-y-1">
              <span className="block">
                Using {preset.label} settings ({preset.host})
              </span>
              {preset.appPassword && (
                <span className="block">This provider requires an app password.</span>
              )}
              {preset.helpUrl && (
                <a
                  href={preset.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block underline underline-offset-2"
                >
                  Where do I find this?
                </a>
              )}
            </p>
          )}

          {oauthNudge && (
            <p id="email-hint" className="text-xs text-amber-400">
              For {OAUTH_LABELS[oauthNudge].provider} use the{' '}
              {OAUTH_LABELS[oauthNudge].button} button on the{' '}
              <Link href="/" className="underline underline-offset-2">
                home page
              </Link>{' '}
              — it&apos;s safer and doesn&apos;t need your password.
            </p>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Email password or app password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={!!oauthNudge}
              className={inputClasses}
            />
          </div>

          {!showAdvanced && (
            <button
              type="button"
              onClick={() => {
                if (preset && !host) {
                  setHost(preset.host)
                  setPort(String(preset.port))
                  setSecure(preset.secure)
                }
                setAdvancedOpen(true)
              }}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline underline-offset-2"
            >
              Advanced: set server manually
            </button>
          )}

          {showAdvanced && (
            <div className="space-y-4 rounded-xl border border-white/10 p-4">
              <div className="space-y-2">
                <label htmlFor="host" className="text-sm font-medium">
                  IMAP server
                </label>
                <input
                  id="host"
                  placeholder="imap.example.com"
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value)
                    setAdvancedEdited(true)
                  }}
                  required
                  className={inputClasses}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="port" className="text-sm font-medium">
                    Port
                  </label>
                  <input
                    id="port"
                    type="number"
                    min="1"
                    max="65535"
                    value={port}
                    onChange={(e) => {
                      setPort(e.target.value)
                      setAdvancedEdited(true)
                    }}
                    required
                    className={inputClasses}
                  />
                </div>
                <label className="flex items-end gap-2 pb-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={secure}
                    onChange={(e) => {
                      setSecure(e.target.checked)
                      setAdvancedEdited(true)
                    }}
                  />
                  Use TLS
                </label>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={loading || !!oauthNudge} className={submitClasses}>
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <p className="text-center">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-200 underline underline-offset-2">
            ← Back to all sign-in options
          </Link>
        </p>
      </div>
    </div>
  )
}
