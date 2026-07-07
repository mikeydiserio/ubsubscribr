import type { UnsubscribeResult } from '@/types'
import { fetchPublic } from './url-guard'

export async function tier1PostUnsubscribe(url: string): Promise<UnsubscribeResult> {
  try {
    // RFC 8058 requires https for one-click unsubscribe URLs.
    const response = await fetchPublic(url, {
      httpsOnly: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'List-Unsubscribe=One-Click',
    })

    if (response.ok) {
      return {
        subscriptionId: '',
        tierUsed: 1,
        status: 'success',
      }
    }

    return {
      subscriptionId: '',
      tierUsed: 1,
      status: 'needs_review',
      error: `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      subscriptionId: '',
      tierUsed: 1,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
