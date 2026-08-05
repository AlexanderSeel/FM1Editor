const DEFAULT_MAXIMUM_BYTES = 2_000_000

export function validateRemoteSysexUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Enter a valid absolute URL.')
  }
  if (url.protocol !== 'https:') throw new Error('Remote SysEx imports require an HTTPS URL.')
  if (!/\.syx(?:ex)?$/i.test(url.pathname)) throw new Error('The URL must point directly to a .syx or .sysex file.')
  return url
}

export async function fetchRemoteSysex(
  value: string,
  maximumBytes = DEFAULT_MAXIMUM_BYTES,
  fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
  const url = validateRemoteSysexUrl(value)
  const response = await fetcher(url, { method: 'GET', mode: 'cors', credentials: 'omit' })
  if (!response.ok) throw new Error(`Remote server returned HTTP ${response.status}.`)

  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`Remote file exceeds the ${maximumBytes.toLocaleString()} byte safety limit.`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > maximumBytes) {
    throw new Error(`Remote file exceeds the ${maximumBytes.toLocaleString()} byte safety limit.`)
  }
  return bytes
}
