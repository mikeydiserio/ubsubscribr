import type { UnsubscribeResult } from '@/types'

const SUCCESS_KEYWORDS = [
  'unsubscribed',
  'you have been unsubscribed',
  'successfully unsubscribed',
  'you are now unsubscribed',
  'subscription removed',
  'you will not receive',
  'you have been removed',
  'email removed',
  'opt-out successful',
  'unsubscribe successful',
]

function detectSuccess(html: string): boolean {
  const lower = html.toLowerCase()
  return SUCCESS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export async function tier3GetUnsubscribe(url: string): Promise<UnsubscribeResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Unsubscribr/1.0)',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return {
        subscriptionId: '',
        tierUsed: 3,
        status: 'needs_review',
        error: `HTTP ${response.status}`,
      }
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      const body = await response.text()

      if (detectSuccess(body)) {
        return {
          subscriptionId: '',
          tierUsed: 3,
          status: 'success',
        }
      }

      const hasForm = /<form/i.test(body)
      const hasButton = /<button/i.test(body) || /input[^>]*type=(?:submit|button)/i.test(body)
      const hasInput = /<input/i.test(body)

      if (hasForm || hasButton || hasInput) {
        return {
          subscriptionId: '',
          tierUsed: 3,
          status: 'needs_review',
          error: 'Page requires interaction — may need browser agent',
        }
      }
    }

    return {
      subscriptionId: '',
      tierUsed: 3,
      status: 'success',
    }
  } catch (error) {
    return {
      subscriptionId: '',
      tierUsed: 3,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
