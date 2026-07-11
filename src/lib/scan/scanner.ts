import type { MailboxProvider } from '@/lib/providers/mailbox-provider'
import type { MailboxMessage, SubscriptionGroup, ScanResult } from '@/types'
import { detectMethod } from '@/lib/engine/unsubscribe-engine'

function extractDomain(fromAddress: string): string {
  const parts = fromAddress.split('@')
  return parts.length === 2 ? parts[1].toLowerCase() : ''
}

export class SubscriptionScanner {
  private provider: MailboxProvider

  constructor(provider: MailboxProvider) {
    this.provider = provider
  }

  async scan(rangeMonths: number = 6): Promise<ScanResult> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - rangeMonths)

    await this.provider.connect()

    const messagesByKey = new Map<string, MailboxMessage[]>()
    let totalMessages = 0

    try {
      for await (const batch of this.provider.listMessages(startDate, endDate)) {
        for (const message of batch) {
          totalMessages++

          // Safety boundary: ordinary correspondence is never an unsubscribe
          // candidate. List-ID alone is not enough (family/discussion lists
          // use it too); require a parseable mechanism supplied by the sender.
          if (!detectMethod(message)) continue

          const key = message.listId
            ? `list:${message.listId}`
            : `from:${message.fromAddress}`

          const existing = messagesByKey.get(key)
          if (existing) {
            existing.push(message)
          } else {
            messagesByKey.set(key, [message])
          }
        }
      }
    } finally {
      await this.provider.disconnect()
    }

    const subscriptions: SubscriptionGroup[] = []

    for (const [, messages] of messagesByKey) {
      messages.sort((a, b) => b.date.getTime() - a.date.getTime())

      const newest = messages[0]
      const method = detectMethod(newest)
      if (!method) continue

      subscriptions.push({
        id: crypto.randomUUID(),
        senderName: newest.fromName || newest.fromAddress,
        fromAddress: newest.fromAddress,
        domain: extractDomain(newest.fromAddress),
        listId: newest.listId || null,
        messageCount: messages.length,
        lastSeen: newest.date,
        detectedMethod: method,
      })
    }

    subscriptions.sort((a, b) => b.messageCount - a.messageCount)

    return { subscriptions, totalMessages }
  }
}
