import type { GitHost } from '../../shared/types'
import { getBaseUrl, getToken } from '../connections'
import { GitHubAdapter } from './github'
import { GitLabAdapter } from './gitlab'
import type { GitHostAdapter } from './types'

/** Build an adapter from explicit credentials (used when verifying a new token). */
export function makeAdapter(host: GitHost, token: string, baseUrl: string): GitHostAdapter {
  return host === 'github' ? new GitHubAdapter(token, baseUrl) : new GitLabAdapter(token, baseUrl)
}

/** Build an adapter from the stored connection, or null if the host isn't connected. */
export function adapterFor(host: GitHost): GitHostAdapter | null {
  const token = getToken(host)
  if (!token) return null
  return makeAdapter(host, token, getBaseUrl(host))
}
