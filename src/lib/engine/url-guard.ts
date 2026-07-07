import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// Unsubscribe URLs come from email headers — attacker-controlled by
// definition. Anything we fetch server-side must resolve to a public
// address, or a crafted List-Unsubscribe header turns this server into an
// SSRF proxy against localhost / cloud metadata / the internal network.

const FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 4

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (/^fe[89ab]/.test(lower)) return true // fe80::/10 link-local
  if (/^f[cd]/.test(lower)) return true // fc00::/7 unique local
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.slice(7))
  return false
}

function isPrivateIp(ip: string): boolean {
  return isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip)
}

async function assertPublicUrl(raw: string, httpsOnly: boolean): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`Invalid URL: ${raw}`)
  }

  if (url.protocol !== 'https:' && (httpsOnly || url.protocol !== 'http:')) {
    throw new Error(`Blocked protocol: ${url.protocol}`)
  }
  if (url.username || url.password) {
    throw new Error('Credentials in URL are not allowed')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked private address')
  } else {
    const addresses = await lookup(host, { all: true }).catch(() => [])
    if (addresses.length === 0) throw new Error(`Cannot resolve host: ${host}`)
    if (addresses.some((a) => isPrivateIp(a.address))) {
      throw new Error('Host resolves to a private address')
    }
  }

  return url
}

// fetch() restricted to public hosts, with a timeout and manual redirect
// handling so every hop is re-validated. (DNS may re-resolve between the
// check and the request — acceptable residual risk for this use case.)
export async function fetchPublic(
  raw: string,
  init: RequestInit & { httpsOnly?: boolean } = {}
): Promise<Response> {
  const { httpsOnly = false, ...rest } = init
  let url = await assertPublicUrl(raw, httpsOnly)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      ...rest,
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (response.status < 300 || response.status >= 400) {
      return response
    }

    const location = response.headers.get('location')
    if (!location) return response

    // Redirect targets only need to be public, not https — the sensitive
    // one-click POST already happened against the validated origin.
    url = await assertPublicUrl(new URL(location, url).toString(), false)
    if (response.status === 303 || response.status === 301 || response.status === 302) {
      rest.method = 'GET'
      delete rest.body
    }
  }

  throw new Error('Too many redirects')
}
