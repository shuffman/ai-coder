/** Compact relative time, e.g. "6h ago", "2d ago". */
export function ago(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

/** Throw a readable error for a non-ok HTTP response. */
export async function ensureOk(res: Response, what: string): Promise<Response> {
  if (res.ok) return res
  let detail = ''
  try {
    detail = (await res.text()).slice(0, 200)
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Not authorized (${res.status}). Check the token's scopes.`)
  }
  throw new Error(`${what} failed (${res.status}). ${detail}`)
}
