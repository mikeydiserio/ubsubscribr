export interface ImapPreset {
  host: string
  port: number
  secure: boolean
  label: string
  appPassword?: boolean
  helpUrl?: string
}

export const IMAP_PRESETS: Record<string, ImapPreset> = {
  'telstra.com': {
    host: 'imap.telstra.com',
    port: 993,
    secure: true,
    label: 'Telstra',
    helpUrl: 'https://www.telstra.com.au/support/email/imap-pop-smtp-mail-server-settings',
  },
  'bigpond.com': {
    host: 'imap.telstra.com',
    port: 993,
    secure: true,
    label: 'Telstra',
    helpUrl: 'https://www.telstra.com.au/support/email/imap-pop-smtp-mail-server-settings',
  },
  'bigpond.net.au': {
    host: 'imap.telstra.com',
    port: 993,
    secure: true,
    label: 'Telstra',
    helpUrl: 'https://www.telstra.com.au/support/email/imap-pop-smtp-mail-server-settings',
  },
  'yahoo.com': {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    label: 'Yahoo',
    appPassword: true,
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html',
  },
  'yahoo.com.au': {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    label: 'Yahoo',
    appPassword: true,
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html',
  },
  'ymail.com': {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    label: 'Yahoo',
    appPassword: true,
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html',
  },
  'rocketmail.com': {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    label: 'Yahoo',
    appPassword: true,
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html',
  },
  'icloud.com': {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    label: 'iCloud',
    appPassword: true,
    helpUrl: 'https://support.apple.com/102654',
  },
  'me.com': {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    label: 'iCloud',
    appPassword: true,
    helpUrl: 'https://support.apple.com/102654',
  },
  'mac.com': {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    label: 'iCloud',
    appPassword: true,
    helpUrl: 'https://support.apple.com/102654',
  },
  'aol.com': {
    host: 'imap.aol.com',
    port: 993,
    secure: true,
    label: 'AOL',
    appPassword: true,
  },
  'optusnet.com.au': {
    host: 'mail.optusnet.com.au',
    port: 993,
    secure: true,
    label: 'Optus',
  },
}

export const OAUTH_DOMAINS: Set<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.com.au',
  'hotmail.com',
  'live.com',
  'msn.com',
])

const GOOGLE_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase()
}

export function findPreset(email: string): ImapPreset | null {
  const domain = domainOf(email)
  if (!domain) return null
  return IMAP_PRESETS[domain] ?? null
}

export function getOauthNudge(domain: string): 'google' | 'microsoft' | null {
  const normalized = domain.trim().toLowerCase()
  if (!OAUTH_DOMAINS.has(normalized)) return null
  return GOOGLE_DOMAINS.has(normalized) ? 'google' : 'microsoft'
}
