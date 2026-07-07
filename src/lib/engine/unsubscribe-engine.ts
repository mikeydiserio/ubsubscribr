import type { UnsubscribeMethod, UnsubscribeResult } from '@/types'
import { tier1PostUnsubscribe } from './tier1-post'
import { tier2MailtoUnsubscribe } from './tier2-mailto'
import { tier3GetUnsubscribe } from './tier3-get'

function parseListUnsubscribe(header: string): { tier: number; url?: string; mailto?: string } | null {
  const entries = header.split(',').map((e) => e.trim().replace(/^<|>$/g, ''))

  for (const entry of entries) {
    if (entry.startsWith('mailto:')) {
      return { tier: 2, mailto: entry }
    }
    if (entry.startsWith('https://') || entry.startsWith('http://')) {
      return { tier: 3, url: entry }
    }
  }

  return null
}

export function detectMethod(message: {
  listUnsubscribe?: string
  listUnsubscribePost?: boolean
}): UnsubscribeMethod | null {
  const header = message.listUnsubscribe
  if (!header) return null

  const parsed = parseListUnsubscribe(header)
  if (!parsed) return null

  const hasOneClick = message.listUnsubscribePost === true

  if (hasOneClick && parsed.url) {
    return { tier: 1, url: parsed.url, description: 'One-click unsubscribe (POST)' }
  }

  if (parsed.mailto) {
    return { tier: 2, mailto: parsed.mailto, description: 'Unsubscribe via email' }
  }

  if (parsed.url) {
    return { tier: 3, url: parsed.url, description: 'Unsubscribe via link (GET)' }
  }

  return null
}

export async function runUnsubscribe(
  method: UnsubscribeMethod,
  fromAddress: string
): Promise<UnsubscribeResult> {
  switch (method.tier) {
    case 1:
      return tier1PostUnsubscribe(method.url!)
    case 2:
      return tier2MailtoUnsubscribe(method.mailto!, fromAddress)
    case 3:
      return tier3GetUnsubscribe(method.url!)
    default:
      return {
        subscriptionId: '',
        tierUsed: method.tier,
        status: 'failed',
        error: `Tier ${method.tier} not implemented in Phase 1`,
      }
  }
}
