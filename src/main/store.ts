import Store from 'electron-store'
import type { Provider, ProjectRef, Settings } from '../shared/types'

const claudePlan: Provider = {
  id: 'claude-plan',
  name: 'Claude Plan',
  kind: 'anthropic-subscription',
  baseUrl: '',
  apiKey: '',
  models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
}

const defaultSettings: Settings = {
  githubToken: '',
  gitlabToken: '',
  providers: [claudePlan],
  roles: {
    coding: { providerId: 'claude-plan', model: 'claude-opus-4-8' },
    review: { providerId: 'claude-plan', model: 'claude-sonnet-4-6' },
    architecture: { providerId: 'claude-plan', model: 'claude-opus-4-8' },
    docs: { providerId: 'claude-plan', model: 'claude-haiku-4-5' }
  }
}

/** A host credential. The token is encrypted at rest (see connections.ts). */
export interface StoredConnection {
  tokenEnc: string
  baseUrl: string
  login: string
}

interface StoreShape {
  settings: Settings
  connections: Record<string, StoredConnection>
  projects: ProjectRef[]
}

export const store = new Store<StoreShape>({
  defaults: { settings: defaultSettings, connections: {}, projects: [] }
})

// ── Settings ─────────────────────────────────────────────────────────────────

const ROLE_KEYS = ['coding', 'review', 'architecture', 'docs'] as const

/** Coerce whatever is on disk (including pre-refactor shapes) into Settings. */
function normalize(raw: unknown): Settings {
  const r = (raw ?? {}) as Record<string, unknown>
  const providersOk = Array.isArray(r.providers) && r.providers.length > 0
  const roles = r.roles as Record<string, { providerId?: string }> | undefined
  const rolesOk = !!roles && ROLE_KEYS.every((k) => typeof roles[k]?.providerId === 'string')
  return {
    githubToken: typeof r.githubToken === 'string' ? r.githubToken : '',
    gitlabToken: typeof r.gitlabToken === 'string' ? r.gitlabToken : '',
    providers: providersOk ? (r.providers as Settings['providers']) : defaultSettings.providers,
    roles: rolesOk ? (r.roles as Settings['roles']) : defaultSettings.roles
  }
}

export function getSettings(): Settings {
  const normalized = normalize(store.get('settings'))
  store.set('settings', normalized)
  return normalized
}

export function saveSettings(settings: Settings): Settings {
  store.set('settings', settings)
  return store.get('settings')
}
