import { randomUUID } from 'crypto'
import type { GitHost, Issue, Project, ProjectRef, PullRequest } from '../shared/types'
import { getBaseUrl } from './connections'
import { adapterFor } from './hosts'
import { store } from './store'

function domainFor(host: GitHost): string {
  if (host === 'github') return 'github.com'
  try {
    return new URL(getBaseUrl('gitlab')).host
  } catch {
    return 'gitlab.com'
  }
}

function refs(): ProjectRef[] {
  return store.get('projects')
}

function findRef(id: string): ProjectRef | undefined {
  return refs().find((r) => r.id === id)
}

export function hasRealProjects(): boolean {
  return refs().length > 0
}

export function getRef(id: string): ProjectRef | undefined {
  return findRef(id)
}

/** Map a stored ref to the UI Project shape. No agent runs yet (Milestone 2), so
 *  the lamp is idle and the operation is a neutral connected state. */
function toProject(ref: ProjectRef): Project {
  return {
    id: ref.id,
    name: ref.fullName.split('/').pop() ?? ref.fullName,
    host: ref.host,
    repoPath: `${domainFor(ref.host)}/${ref.fullName}`,
    description: ref.description || 'No description.',
    state: 'idle',
    operation: 'connected · no agent yet'
  }
}

export function listProjects(): Project[] {
  return refs().map(toProject)
}

export async function addProject(host: GitHost, key: string): Promise<Project> {
  const adapter = adapterFor(host)
  if (!adapter) throw new Error(`${host} is not connected.`)
  const meta = await adapter.getRepo(key)
  const ref: ProjectRef = {
    id: randomUUID(),
    host,
    key,
    fullName: meta.fullName,
    description: meta.description
  }
  // De-dupe: same host+key just returns the existing one.
  const existing = refs().find((r) => r.host === host && r.key === key)
  if (existing) return toProject(existing)
  store.set('projects', [...refs(), ref])
  return toProject(ref)
}

export function removeProject(id: string): void {
  store.set(
    'projects',
    refs().filter((r) => r.id !== id)
  )
}

export async function issuesFor(projectId: string): Promise<Issue[]> {
  const ref = findRef(projectId)
  if (!ref) return []
  const adapter = adapterFor(ref.host)
  if (!adapter) throw new Error(`${ref.host} is not connected.`)
  return adapter.listIssues(ref.key)
}

export async function pullsFor(projectId: string): Promise<PullRequest[]> {
  const ref = findRef(projectId)
  if (!ref) return []
  const adapter = adapterFor(ref.host)
  if (!adapter) throw new Error(`${ref.host} is not connected.`)
  return adapter.listPullRequests(ref.key)
}
