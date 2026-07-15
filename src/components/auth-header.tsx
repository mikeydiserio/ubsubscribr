'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DonateLink from '@/components/donate-link'

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
    <header className="relative top-0 z-20 border-b border-white/5">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-neutral-500">
          Unsubscri<span className="text-accent">br</span>
        </Link>
        <div className="flex items-center gap-3">
          <DonateLink />
          {email && (
            <>
              <span className="hidden text-xs text-neutral-500 sm:inline">
                {email}
              </span>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:border-accent/30 hover:bg-white/5 disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
