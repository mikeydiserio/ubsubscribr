import type { MailboxMessage } from '@/types'

export interface MailboxProvider {
  connect(): Promise<void>
  listMessages(startDate: Date, endDate: Date): AsyncGenerator<MailboxMessage[]>
  getMessage(id: string): Promise<MailboxMessage>
  disconnect(): Promise<void>
}
