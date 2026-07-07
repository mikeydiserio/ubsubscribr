// googleapis bundles its own google-auth-library; deriving the client type
// from google.auth.OAuth2 itself avoids clashing with the app-level copy.
import { google, type gmail_v1 } from 'googleapis'
import type { MailboxProvider } from './mailbox-provider'
import type { MailboxMessage } from '@/types'

interface GoogleToken {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

export interface RefreshedTokens {
  accessToken: string
  refreshToken?: string
  expiryDate: number
}

interface HeaderDict {
  name?: string | null
  value?: string | null
}

const MESSAGE_FETCH_CONCURRENCY = 20

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

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string | undefined {
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
  private auth: InstanceType<typeof google.auth.OAuth2>
  private gmail: ReturnType<typeof google.gmail>

  constructor(
    tokens: GoogleToken,
    onTokensRefreshed?: (tokens: RefreshedTokens) => Promise<void>
  ) {
    this.auth = new google.auth.OAuth2(
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
      if (newTokens.access_token && onTokensRefreshed) {
        onTokensRefreshed({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || undefined,
          expiryDate: newTokens.expiry_date || Date.now() + 3600_000,
        }).catch((error) => {
          console.error('Failed to persist refreshed Google tokens:', error)
        })
      }
    })
    this.gmail = google.gmail({ version: 'v1', auth: this.auth })
  }

  async connect(): Promise<void> {
    // No pre-validation: the access token may be expired, and the client
    // refreshes it lazily on the first API call using the refresh token.
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

      for (let i = 0; i < messageRefs.length; i += MESSAGE_FETCH_CONCURRENCY) {
        const chunk = messageRefs.slice(i, i + MESSAGE_FETCH_CONCURRENCY)
        const results = await Promise.allSettled(
          chunk.map((ref) =>
            this.gmail.users.messages.get({
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
          )
        )

        for (const result of results) {
          if (result.status !== 'fulfilled') continue
          const full = result.value
          const rawHeaders: HeaderDict[] = full.data.payload?.headers || []
          const headers = parseHeaders(rawHeaders)
          batch.push({
            id: full.data.id!,
            fromAddress: extractEmail(headers['from'] || ''),
            fromName: extractName(headers['from'] || ''),
            subject: headers['subject'] || '(no subject)',
            date: new Date(headers['date'] || Date.now()),
            listId: headers['list-id']?.replace(/\s+/g, ' ').trim(),
            listUnsubscribe: headers['list-unsubscribe'],
            listUnsubscribePost:
              headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
          })
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
    // Nothing to close: the Gmail API is stateless REST. Revoking the OAuth
    // grant is a separate, explicit action (revokeAccess) — the scanner calls
    // disconnect() after every scan and must not kill the connection.
  }

  async revokeAccess(): Promise<void> {
    try {
      await this.auth.revokeCredentials()
    } catch {
      // Token may already be revoked
    }
  }
}
