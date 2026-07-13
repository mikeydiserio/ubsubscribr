import { NextRequest, NextResponse } from 'next/server'
import { ImapMailboxAdapter } from '@/lib/providers/imap-adapter'
import { parseImapConnection } from '@/lib/providers/imap-validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const attempts = new Map<string, { count: number; resetAt: number }>()

function pruneExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key)
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  pruneExpired(now)
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const conn = parseImapConnection({
    host: body.host,
    port: body.port,
    secure: body.secure,
    username: email,
    password: body.password,
  })

  if (!conn) {
    return NextResponse.json({ error: 'Check the mail server settings.' }, { status: 400 })
  }

  const adapter = new ImapMailboxAdapter(conn)
  try {
    await adapter.connect()
    await adapter.disconnect()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const code = (error as { code?: string })?.code ?? ''
    const authFailed = (error as { authenticationFailed?: boolean })?.authenticationFailed === true

    console.error('IMAP login test failed:', authFailed ? 'auth-failed' : code || 'unknown-error')

    if (message === 'Private or local IMAP servers are not allowed') {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (authFailed) {
      return NextResponse.json(
        {
          error:
            'Your email provider rejected the sign-in. Check your password — some providers require an app password.',
        },
        { status: 401 }
      )
    }

    if (
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNREFUSED' ||
      message.includes('could not be resolved')
    ) {
      return NextResponse.json(
        { error: 'Could not reach the mail server. Check the server settings.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Could not sign in. Please try again.' },
      { status: 500 }
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 })
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (
    createError &&
    createError.code !== 'email_exists' &&
    !createError.message?.toLowerCase().includes('already registered')
  ) {
    console.error('Failed to create user for IMAP sign-in:', createError.code || createError.message)
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 })
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    console.error('Failed to generate sign-in link:', linkError?.code || linkError?.message)
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 })
  }

  const { supabase, supabaseResponse } = createRouteHandlerClient(request)
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: linkData.properties.hashed_token,
  })

  if (otpError) {
    console.error('Failed to verify sign-in token:', otpError.code || otpError.message)
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: supabaseResponse.headers })
}
