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

export async function tier2MailtoUnsubscribe(
  mailtoUrl: string,
  senderAddress: string
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

  try {
    const mailtoSubject = parsed.subject || 'unsubscribe'
    const encodedTo = encodeURIComponent(parsed.address)
    const encodedSubject = encodeURIComponent(mailtoSubject)
    const encodedBody = encodeURIComponent(
      `Please unsubscribe me from this mailing list.\n\nSent from: ${senderAddress}`
    )

    const mailtoLink = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`

    return {
      subscriptionId: '',
      tierUsed: 2,
      status: 'needs_review',
      error: 'Mailto link generated — user needs to send from their mail client',
    }
  } catch (error) {
    return {
      subscriptionId: '',
      tierUsed: 2,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
