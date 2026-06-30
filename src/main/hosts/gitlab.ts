import type { HostRepo, Issue, PullRequest } from '../../shared/types'
import type { GitHostAdapter, RepoMeta } from './types'
import { ago, ensureOk } from './util'

/**
 * GitLab (gitlab.com or self-hosted) via the REST API v4.
 * `key` is the URL-encoded `path_with_namespace` (also accepts a numeric id).
 */
export class GitLabAdapter implements GitHostAdapter {
  constructor(
    private token: string,
    /** Instance base, e.g. https://gitlab.com or https://aus-gitlab.internal. */
    private base: string
  ) {}

  private get apiBase(): string {
    return this.base.replace(/\/$/, '') + '/api/v4'
  }

  private get headers(): Record<string, string> {
    return { 'PRIVATE-TOKEN': this.token, 'User-Agent': 'ai-coder' }
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(this.apiBase + path, { headers: this.headers })
    await ensureOk(res, `GitLab ${path}`)
    return (await res.json()) as T
  }

  /** Follow GitLab's `x-next-page` header to fetch every page (100/page). */
  private async getAll<T>(path: string): Promise<T[]> {
    const out: T[] = []
    const sep = path.includes('?') ? '&' : '?'
    let page = 1
    for (let i = 0; i < 50; i++) {
      const res = await fetch(`${this.apiBase}${path}${sep}per_page=100&page=${page}`, {
        headers: this.headers
      })
      await ensureOk(res, `GitLab ${path}`)
      out.push(...((await res.json()) as T[]))
      const next = res.headers.get('x-next-page')
      if (!next) break
      const n = Number(next)
      if (!Number.isFinite(n) || n < 1) break
      page = n
    }
    return out
  }

  async verify(): Promise<{ ok: boolean; login?: string; error?: string }> {
    try {
      const me = await this.get<{ username: string }>('/user')
      return { ok: true, login: me.username }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  async listRepos(): Promise<HostRepo[]> {
    const projects = await this.getAll<GlProject>(
      '/projects?membership=true&simple=true&order_by=last_activity_at'
    )
    return projects.map((p) => ({
      key: encodeURIComponent(p.path_with_namespace),
      fullName: p.path_with_namespace,
      defaultBranch: p.default_branch ?? 'main',
      description: p.description ?? ''
    }))
  }

  async getRepo(key: string): Promise<RepoMeta> {
    const p = await this.get<GlProject>(`/projects/${key}`)
    return {
      fullName: p.path_with_namespace,
      description: p.description ?? '',
      defaultBranch: p.default_branch ?? 'main'
    }
  }

  async listIssues(key: string): Promise<Issue[]> {
    const items = await this.get<GlIssue[]>(`/projects/${key}/issues?state=opened&per_page=50`)
    return items.map((i) => ({
      id: `#${i.iid}`,
      title: i.title,
      author: i.author ? `@${i.author.username}` : '@unknown',
      comments: i.user_notes_count,
      ageLabel: ago(i.created_at),
      state: 'open' as const,
      labels: i.labels,
      costUsd: 0,
      costIsEstimate: true
    }))
  }

  async listPullRequests(key: string): Promise<PullRequest[]> {
    const items = await this.get<GlMr[]>(`/projects/${key}/merge_requests?state=opened&per_page=50`)
    return items.map((m) => ({
      id: `#${m.iid}`,
      title: m.title,
      detail: `${m.source_branch} → ${m.target_branch}${m.draft ? ' · draft' : ''}`,
      state: 'review' as const,
      labels: m.labels,
      costUsd: 0,
      aiAuthored: false
    }))
  }
}

interface GlProject {
  path_with_namespace: string
  default_branch: string | null
  description: string | null
}
interface GlIssue {
  iid: number
  title: string
  user_notes_count: number
  created_at: string
  author: { username: string } | null
  labels: string[]
}
interface GlMr {
  iid: number
  title: string
  draft: boolean
  source_branch: string
  target_branch: string
  labels: string[]
}
