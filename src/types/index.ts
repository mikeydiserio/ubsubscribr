export interface MailboxMessage {
  id: string
  fromAddress: string
  fromName: string
  subject: string
  date: Date
  listId?: string
  listUnsubscribe?: string
  listUnsubscribePost?: boolean
  bodyHtml?: string
}

export interface SubscriptionGroup {
  id: string
  senderName: string
  fromAddress: string
  domain: string
  listId: string | null
  messageCount: number
  lastSeen: Date
  detectedMethod: UnsubscribeMethod | null
}

export interface UnsubscribeMethod {
  tier: 1 | 2 | 3 | 4 | 5
  url?: string
  mailto?: string
  description: string
}

export type UnsubscribeStatus = 'success' | 'needs_review' | 'failed'

export interface UnsubscribeResult {
  subscriptionId: string
  tierUsed: 1 | 2 | 3 | 4 | 5
  status: UnsubscribeStatus
  error?: string
}

export interface ScanResult {
  subscriptions: SubscriptionGroup[]
  totalMessages: number
}

export interface OAuthSession {
  accessToken: string
  refreshToken: string
  expiryDate: number
  email: string
}

export interface UserSession {
  userId: string
  email: string
  provider: 'google' | 'microsoft' | 'apple' | 'email'
}
