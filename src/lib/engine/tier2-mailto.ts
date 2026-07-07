import type { UnsubscribeResult } from '@/types'

interface MailtoParseResult {
  address: string
  subject?: string
}

function parseMailto(mailto: string): MailtoParseResult | null {
  const match = mailto.match(/^mailto:(.+?)(?:\?(.+))?$/i)
  if (!match) return null

  const address = match[1]
  let subject: string | undefined

  if (match[2]) {
    const params = new URLSearchParams(match[2])
    subject = params.get('subject') || undefined
  }

  return { address, subject }
}

// The app has no mail-send scope (gmail.metadata is read-only), so mailto
// unsubscribes can't be automated. Hand the user a ready-to-send mailto link
// instead.
export async function tier2MailtoUnsubscribe(
  mailtoUrl: string
): Promise<UnsubscribeResult> {
  const parsed = parseMailto(mailtoUrl)
  if (!parsed) {
    return {
      subscriptionId: '',
      tierUsed: 2,
      status: 'failed',
      error: 'Invalid mailto URL',
    }
  }

  const subject = encodeURIComponent(parsed.subject || 'unsubscribe')
  const body = encodeURIComponent('Please unsubscribe me from this mailing list.')

  return {
    subscriptionId: '',
    tierUsed: 2,
    status: 'needs_review',
    error: 'This sender only supports unsubscribe by email — send it from your mail client',
    mailtoLink: `mailto:${encodeURIComponent(parsed.address)}?subject=${subject}&body=${body}`,
  }
}
