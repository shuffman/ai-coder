import type { HostRepo, Issue, PullRequest } from '../../shared/types'
import type { GitHostAdapter, NewPullRequest, RepoMeta } from './types'
import { ago, ensureOk } from './util'

/** GitHub (github.com or Enterprise) via the REST API. `key` is "owner/repo". */
export class GitHubAdapter implements GitHostAdapter {
  constructor(
    private token: string,
    /** API base, e.g. https://api.github.com (or https://ghe.example.com/api/v3). */
    private apiBase: string
  ) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-coder'
    }
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(this.apiBase.replace(/\/$/, '') + path, { headers: this.headers })
    await ensureOk(res, `GitHub ${path}`)
    return (await res.json()) as T
  }

  /** Fetch every page (100/page) until a short page signals the end. */
  private async getAll<T>(path: string): Promise<T[]> {
    const out: T[] = []
    const sep = path.includes('?') ? '&' : '?'
    for (let page = 1; page <= 50; page++) {
      const res = await fetch(
        `${this.apiBase.replace(/\/$/, '')}${path}${sep}per_page=100&page=${page}`,
        { headers: this.headers }
      )
      await ensureOk(res, `GitHub ${path}`)
      const batch = (await res.json()) as T[]
      out.push(...batch)
      if (batch.length < 100) break
    }
    return out
  }

  async verify(): Promise<{ ok: boolean; login?: string; error?: string }> {
    try {
      const me = await this.get<{ login: string }>('/user')
      return { ok: true, login: me.login }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  async listRepos(): Promise<HostRepo[]> {
    const repos = await this.getAll<GhRepo>(
      '/user/repos?sort=updated&affiliation=owner,collaborator,organization_member'
    )
    return repos.map((r) => ({
      key: r.full_name,
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      description: r.description ?? ''
    }))
  }

  async getRepo(key: string): Promise<RepoMeta> {
    const r = await this.get<GhRepo>(`/repos/${key}`)
    return {
      fullName: r.full_name,
      description: r.description ?? '',
      defaultBranch: r.default_branch,
      cloneUrl: r.clone_url ?? `https://github.com/${key}.git`
    }
  }

  async createPullRequest(key: string, pr: NewPullRequest): Promise<string> {
    const res = await fetch(`${this.apiBase.replace(/\/$/, '')}/repos/${key}/pulls`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: pr.title, body: pr.body, head: pr.head, base: pr.base })
    })
    await ensureOk(res, `GitHub open PR`)
    const created = (await res.json()) as { html_url: string }
    return created.html_url
  }

  async listIssues(key: string): Promise<Issue[]> {
    const items = await this.get<GhIssue[]>(`/repos/${key}/issues?state=open&per_page=50`)
    // The issues endpoint also returns PRs; drop anything with a pull_request field.
    return items
      .filter((i) => !i.pull_request)
      .map((i) => ({
        id: `#${i.number}`,
        title: i.title,
        author: i.user ? `@${i.user.login}` : '@unknown',
        comments: i.comments,
        ageLabel: ago(i.created_at),
        state: 'open' as const,
        labels: i.labels.map((l) => l.name),
        costUsd: 0,
        costIsEstimate: true
      }))
  }

  async listPullRequests(key: string): Promise<PullRequest[]> {
    const items = await this.get<GhPull[]>(`/repos/${key}/pulls?state=open&per_page=50`)
    return items.map((p) => ({
      id: `#${p.number}`,
      title: p.title,
      detail: `${p.head.ref} → ${p.base.ref}${p.draft ? ' · draft' : ''}`,
      state: 'review' as const,
      labels: p.labels.map((l) => l.name),
      costUsd: 0,
      aiAuthored: false
    }))
  }
}

interface GhRepo {
  full_name: string
  default_branch: string
  description: string | null
  clone_url?: string
}
interface GhIssue {
  number: number
  title: string
  comments: number
  created_at: string
  user: { login: string } | null
  labels: { name: string }[]
  pull_request?: unknown
}
interface GhPull {
  number: number
  title: string
  draft: boolean
  head: { ref: string }
  base: { ref: string }
  labels: { name: string }[]
}
