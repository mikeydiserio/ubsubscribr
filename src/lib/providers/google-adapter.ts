import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type { MailboxProvider } from './mailbox-provider'
import type { MailboxMessage } from '@/types'

interface GoogleToken {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

interface HeaderDict {
  name?: string | null
  value?: string | null
}

function parseHeaders(headers: HeaderDict[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of headers) {
    if (h.name && h.value) {
      map[h.name.toLowerCase()] = h.value
    }
  }
  return map
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : from.toLowerCase().trim()
}

function extractName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim().replace(/^"+|"+$/g, '') : from
}

function extractBody(payload: any): string | undefined {
  if (!payload) return undefined

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8')
      }
      const nested = extractBody(part)
      if (nested) return nested
    }
  }

  return undefined
}

export class GoogleMailboxAdapter implements MailboxProvider {
  private auth: OAuth2Client
  private gmail: ReturnType<typeof google.gmail>

  constructor(tokens: GoogleToken) {
    this.auth = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    )
    this.auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    })
    this.auth.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        this.auth.setCredentials({
          ...this.auth.credentials,
          refresh_token: newTokens.refresh_token,
        })
      }
    })
    this.gmail = google.gmail({ version: 'v1', auth: this.auth as any })
  }

  async connect(): Promise<void> {
    const tokenInfo = await this.auth.getTokenInfo(
      this.auth.credentials.access_token as string
    )
    if (!tokenInfo) throw new Error('Invalid token')
  }

  async *listMessages(
    startDate: Date,
    endDate: Date
  ): AsyncGenerator<MailboxMessage[]> {
    let pageToken: string | undefined
    const query = [
      `after:${Math.floor(startDate.getTime() / 1000)}`,
      `before:${Math.floor(endDate.getTime() / 1000)}`,
    ].join(' ')

    do {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        pageToken,
        maxResults: 100,
      })

      const messageRefs = response.data.messages || []
      if (messageRefs.length === 0) break

      const batch: MailboxMessage[] = []

      for (const ref of messageRefs) {
        try {
          const full = await this.gmail.users.messages.get({
            userId: 'me',
            id: ref.id!,
            format: 'metadata',
            metadataHeaders: [
              'From',
              'Subject',
              'Date',
              'List-ID',
              'List-Unsubscribe',
              'List-Unsubscribe-Post',
            ],
          })

          const rawHeaders: HeaderDict[] = full.data.payload?.headers || []
          const headers = parseHeaders(rawHeaders)
          const message: MailboxMessage = {
            id: full.data.id!,
            fromAddress: extractEmail(headers['from'] || ''),
            fromName: extractName(headers['from'] || ''),
            subject: headers['subject'] || '(no subject)',
            date: new Date(headers['date'] || Date.now()),
            listId: headers['list-id']?.replace(/\s+/g, ' ').trim(),
            listUnsubscribe: headers['list-unsubscribe'],
            listUnsubscribePost:
              headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
          }
          batch.push(message)
        } catch {
          continue
        }
      }

      yield batch
      pageToken = response.data.nextPageToken || undefined
    } while (pageToken)
  }

  async getMessage(id: string): Promise<MailboxMessage> {
    const full = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    })

    const rawHeaders: HeaderDict[] = full.data.payload?.headers || []
    const headers = parseHeaders(rawHeaders)

    return {
      id: full.data.id!,
      fromAddress: extractEmail(headers['from'] || ''),
      fromName: extractName(headers['from'] || ''),
      subject: headers['subject'] || '(no subject)',
      date: new Date(headers['date'] || Date.now()),
      listId: headers['list-id']?.replace(/\s+/g, ' ').trim(),
      listUnsubscribe: headers['list-unsubscribe'],
      listUnsubscribePost:
        headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
      bodyHtml: extractBody(full.data.payload),
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.auth.revokeCredentials()
    } catch {
      // Token may already be revoked
    }
  }
}
