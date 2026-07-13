import type { ImapConnection } from './imap-adapter'

export function parseImapConnection(value: unknown): ImapConnection | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const host = typeof input.host === 'string' ? input.host.trim() : ''
  const username = typeof input.username === 'string' ? input.username.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const port = Number(input.port)
  if (
    !host || host.length > 253 || !/^[a-z0-9.-]+$/i.test(host) ||
    !username || username.length > 320 || !password || password.length > 1024 ||
    !Number.isInteger(port) || port < 1 || port > 65535
  ) {
    return null
  }
  return { host, username, password, port, secure: input.secure !== false }
}
