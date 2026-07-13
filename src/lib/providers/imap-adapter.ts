import { ImapFlow } from 'imapflow'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isPrivateIp } from '@/lib/engine/url-guard'
import type { MailboxProvider } from './mailbox-provider'
import type { MailboxMessage } from '@/types'

export interface ImapConnection {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

const HEADER_NAMES = [
  'From',
  'Subject',
  'Date',
  'List-ID',
  'List-Unsubscribe',
  'List-Unsubscribe-Post',
]

function parseHeaders(raw: Buffer): Record<string, string> {
  const result: Record<string, string> = {}
  const unfolded = raw.toString('utf8').replace(/\r?\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator < 1) continue
    result[line.slice(0, separator).toLowerCase()] = line.slice(separator + 1).trim()
  }
  return result
}

function parseFrom(value: string): { name: string; address: string } {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/)
  const address = (match?.[2] || value).trim().toLowerCase()
  const name = (match?.[1] || address).trim().replace(/^"|"$/g, '')
  return { name, address }
}

export class ImapMailboxAdapter implements MailboxProvider {
  private readonly client: ImapFlow
  private readonly host: string

  constructor(connection: ImapConnection) {
    this.host = connection.host
    this.client = new ImapFlow({
      host: connection.host,
      port: connection.port,
      secure: connection.secure,
      // Port 143 is only acceptable when the server completes STARTTLS. Never
      // send mailbox credentials over a connection that stays in plaintext.
      ...(connection.secure ? {} : { doSTARTTLS: true }),
      auth: { user: connection.username, pass: connection.password },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 60_000,
      logger: false,
    })
  }

  async connect(): Promise<void> {
    const host = this.host
    const addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true }).catch(() => [])
    if (addresses.length === 0) throw new Error('IMAP server could not be resolved')
    if (addresses.some(({ address }) => isPrivateIp(address))) {
      throw new Error('Private or local IMAP servers are not allowed')
    }
    try {
      await this.client.connect()
    } catch (error) {
      // connect() can fail after opening a socket but before the client is
      // usable. Ensure that socket does not survive the request.
      this.client.close()
      throw error
    }
  }

  async *listMessages(
    startDate: Date,
    endDate: Date
  ): AsyncGenerator<MailboxMessage[]> {
    const lock = await this.client.getMailboxLock('INBOX')
    try {
      const uids = await this.client.search({ since: startDate, before: endDate }, { uid: true })
      if (!uids || uids.length === 0) return
      const batch: MailboxMessage[] = []
      for await (const message of this.client.fetch(
        uids,
        { uid: true, envelope: true, internalDate: true, headers: HEADER_NAMES },
        { uid: true }
      )) {
        const headers = parseHeaders(message.headers || Buffer.alloc(0))
        const from = parseFrom(headers['from'] || message.envelope?.from?.[0]?.address || '')
        if (!from.address) continue
        batch.push({
          id: String(message.uid),
          fromAddress: from.address,
          fromName: from.name,
          subject: headers['subject'] || message.envelope?.subject || '(no subject)',
          date: new Date(headers['date'] || message.internalDate || Date.now()),
          listId: headers['list-id']?.replace(/\s+/g, ' ').trim(),
          listUnsubscribe: headers['list-unsubscribe'],
          listUnsubscribePost:
            headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
        })
        if (batch.length === 100) {
          yield batch.splice(0, batch.length)
        }
      }
      if (batch.length) yield batch
    } finally {
      lock.release()
    }
  }

  async getMessage(id: string): Promise<MailboxMessage> {
    const message = await this.client.fetchOne(
      id,
      { uid: true, envelope: true, internalDate: true, headers: HEADER_NAMES },
      { uid: true }
    )
    if (!message) throw new Error('Message not found')
    const headers = parseHeaders(message.headers || Buffer.alloc(0))
    const from = parseFrom(headers['from'] || message.envelope?.from?.[0]?.address || '')
    return {
      id,
      fromAddress: from.address,
      fromName: from.name,
      subject: headers['subject'] || message.envelope?.subject || '(no subject)',
      date: new Date(headers['date'] || message.internalDate || Date.now()),
      listId: headers['list-id'],
      listUnsubscribe: headers['list-unsubscribe'],
      listUnsubscribePost:
        headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client.usable) {
      this.client.close()
      return
    }

    try {
      await this.client.logout()
    } catch {
      this.client.close()
    }
  }
}
