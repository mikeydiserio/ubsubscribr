export interface ImapCredentials {
  host: string
  port: string
  secure: boolean
  username: string
  password: string
}

let credentials: ImapCredentials | null = null

export function setImapCredentials(c: ImapCredentials): void {
  credentials = c
}

export function takeImapCredentials(): ImapCredentials | null {
  const current = credentials
  credentials = null
  return current
}
