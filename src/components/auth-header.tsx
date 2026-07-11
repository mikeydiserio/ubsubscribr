'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AuthHeader() {
  const [email, setEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase

    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    try {
      await supabaseRef.current?.auth.signOut()
    } catch {
      // Cookies may already be gone; the reload below resolves either way
    }
    sessionStorage.clear()
    // Full reload so the proxy re-evaluates the (now signed-out) session
    window.location.href = '/'
  }

  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-bold tracking-tight">
          Unsubscribr
        </Link>
        {email && (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-400 sm:inline">
              {email}
            </span>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
