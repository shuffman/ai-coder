import type { HostRepo, Issue, PullRequest } from '../../shared/types'

export interface RepoMeta {
  fullName: string
  description: string
  defaultBranch: string
  /** HTTPS clone URL, e.g. https://github.com/acme/payments-service.git */
  cloneUrl: string
}

export interface NewPullRequest {
  title: string
  body: string
  head: string // source branch
  base: string // target branch
}

/**
 * The host-abstraction seam. GitHub and GitLab each implement this; everything
 * above only deals in our domain shapes (HostRepo, Issue, PullRequest).
 * `key` is host-specific: "owner/repo" for GitHub, an encoded path/id for GitLab.
 */
export interface GitHostAdapter {
  /** Validate the token; returns the authenticated user's login on success. */
  verify(): Promise<{ ok: boolean; login?: string; error?: string }>
  listRepos(): Promise<HostRepo[]>
  getRepo(key: string): Promise<RepoMeta>
  listIssues(key: string): Promise<Issue[]>
  listPullRequests(key: string): Promise<PullRequest[]>
  /** Open a pull/merge request; returns its web URL. */
  createPullRequest(key: string, pr: NewPullRequest): Promise<string>
}
