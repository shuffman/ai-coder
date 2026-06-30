import { safeStorage } from 'electron'
import type { ConnectionStatus, GitHost } from '../shared/types'
import { store, type StoredConnection } from './store'

const DEFAULT_BASE: Record<GitHost, string> = {
  github: 'https://api.github.com',
  gitlab: 'https://gitlab.com'
}

function encrypt(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64')
  }
  // Fallback (e.g. Linux without a keyring): obfuscate only. Logged once by caller.
  return 'plain:' + Buffer.from(token, 'utf8').toString('base64')
}

function decrypt(enc: string): string {
  if (enc.startsWith('plain:')) return Buffer.from(enc.slice(6), 'base64').toString('utf8')
  return safeStorage.decryptString(Buffer.from(enc, 'base64'))
}

export function getToken(host: GitHost): string | null {
  const c = store.get('connections')[host]
  if (!c) return null
  try {
    return decrypt(c.tokenEnc)
  } catch {
    return null
  }
}

export function getBaseUrl(host: GitHost): string {
  return store.get('connections')[host]?.baseUrl || DEFAULT_BASE[host]
}

export function listConnections(): ConnectionStatus[] {
  const conns = store.get('connections')
  return (['github', 'gitlab'] as GitHost[]).map((host) => {
    const c = conns[host]
    return {
      host,
      connected: !!c,
      login: c?.login,
      baseUrl: c?.baseUrl || DEFAULT_BASE[host]
    }
  })
}

export function saveConnection(host: GitHost, token: string, baseUrl: string, login: string): void {
  const stored: StoredConnection = {
    tokenEnc: encrypt(token),
    baseUrl: baseUrl || DEFAULT_BASE[host],
    login
  }
  store.set('connections', { ...store.get('connections'), [host]: stored })
}

export function clearConnection(host: GitHost): void {
  const conns = { ...store.get('connections') }
  delete conns[host]
  store.set('connections', conns)
}

export { DEFAULT_BASE }
