import type { UnsubscribeResult } from '@/types'

export async function tier1PostUnsubscribe(url: string): Promise<UnsubscribeResult> {
  try {
    const response = await fetch(url, {
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
