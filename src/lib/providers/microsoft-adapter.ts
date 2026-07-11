import type { MailboxProvider } from './mailbox-provider'
import type { MailboxMessage } from '@/types'
import { ConfidentialClientApplication } from '@azure/msal-node'

interface MicrosoftTokens {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

type RefreshedMicrosoftTokens = MicrosoftTokens

interface GraphHeader {
  name?: string
  value?: string
}

interface GraphMessage {
  id: string
  subject?: string
  receivedDateTime?: string
  from?: { emailAddress?: { name?: string; address?: string } }
  internetMessageHeaders?: GraphHeader[]
}

interface GraphPage {
  value?: GraphMessage[]
  '@odata.nextLink'?: string
}

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'

function headerMap(headers: GraphHeader[] = []): Record<string, string> {
  const result: Record<string, string> = {}
  for (const header of headers) {
    if (header.name && header.value) result[header.name.toLowerCase()] = header.value
  }
  return result
}

function normalizeMessage(message: GraphMessage): MailboxMessage {
  const headers = headerMap(message.internetMessageHeaders)
  const address = message.from?.emailAddress?.address?.toLowerCase() || ''
  return {
    id: message.id,
    fromAddress: address,
    fromName: message.from?.emailAddress?.name || address,
    subject: message.subject || '(no subject)',
    date: new Date(message.receivedDateTime || Date.now()),
    listId: headers['list-id']?.replace(/\s+/g, ' ').trim(),
    listUnsubscribe: headers['list-unsubscribe'],
    listUnsubscribePost:
      headers['list-unsubscribe-post']?.toLowerCase().includes('one-click') ?? false,
  }
}

export class MicrosoftMailboxAdapter implements MailboxProvider {
  private tokens: MicrosoftTokens
  private readonly msal: ConfidentialClientApplication

  constructor(
    tokens: MicrosoftTokens,
    private readonly onTokensRefreshed?: (
      tokens: RefreshedMicrosoftTokens
    ) => Promise<void>
  ) {
    this.tokens = tokens
    this.msal = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
      },
    })
    if (tokens.refreshToken) {
      this.msal.getTokenCache().deserialize(tokens.refreshToken)
    }
  }

  async connect(): Promise<void> {
    if (this.tokens.expiryDate <= Date.now() + 60_000) await this.refreshAccessToken(false)
  }

  async *listMessages(
    startDate: Date,
    endDate: Date
  ): AsyncGenerator<MailboxMessage[]> {
    const select = [
      'id',
      'subject',
      'from',
      'receivedDateTime',
      'internetMessageHeaders',
    ].join(',')
    const filter = `receivedDateTime ge ${startDate.toISOString()} and receivedDateTime lt ${endDate.toISOString()}`
    let url = `${GRAPH_ROOT}/me/messages?$select=${encodeURIComponent(select)}&$filter=${encodeURIComponent(filter)}&$orderby=receivedDateTime desc&$top=100`

    while (url) {
      const page = await this.graphRequest<GraphPage>(url)
      yield (page.value || []).map(normalizeMessage).filter((message) => message.fromAddress)
      url = page['@odata.nextLink'] || ''
    }
  }

  async getMessage(id: string): Promise<MailboxMessage> {
    const select = 'id,subject,from,receivedDateTime,internetMessageHeaders,body'
    const message = await this.graphRequest<GraphMessage>(
      `${GRAPH_ROOT}/me/messages/${encodeURIComponent(id)}?$select=${encodeURIComponent(select)}`
    )
    return normalizeMessage(message)
  }

  async disconnect(): Promise<void> {}

  private async graphRequest<T>(url: string, retried = false): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    })
    if (response.status === 401 && !retried && this.tokens.refreshToken) {
      await this.refreshAccessToken(true)
      return this.graphRequest<T>(url, true)
    }
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Microsoft Graph request failed (${response.status}): ${detail.slice(0, 300)}`)
    }
    return response.json() as Promise<T>
  }

  private async refreshAccessToken(forceRefresh: boolean): Promise<void> {
    if (!this.tokens.refreshToken) throw new Error('Microsoft connection has expired. Reconnect your inbox.')
    const accounts = await this.msal.getTokenCache().getAllAccounts()
    const account = accounts[0]
    if (!account) throw new Error('Microsoft connection has expired. Reconnect your inbox.')
    const result = await this.msal.acquireTokenSilent({
      account,
      scopes: ['Mail.Read', 'User.Read'],
      forceRefresh,
    })
    if (!result?.accessToken) throw new Error('Microsoft token refresh failed')

    this.tokens = {
      accessToken: result.accessToken,
      refreshToken: this.msal.getTokenCache().serialize(),
      expiryDate: result.expiresOn?.getTime() || Date.now() + 3600_000,
    }
    await this.onTokensRefreshed?.(this.tokens)
  }
}
