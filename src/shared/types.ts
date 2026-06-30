// Shared domain types used across main, preload, and renderer.

/** Which git host a project lives on. The host-abstraction seam: every host
 *  (GitHub, GitLab) is reduced to this enum + a common project/issue/PR shape. */
export type GitHost = 'github' | 'gitlab'

/** Current activity of a project's agent, in priority order for the fleet view. */
export type AgentState =
  | 'working' // authoring code / a PR right now
  | 'reviewing' // a review agent is inspecting a PR
  | 'authoring' // drafting (sub-state of working, kept distinct for color)
  | 'attention' // needs the human (blocked / failed / decision)
  | 'clear' // all caught up
  | 'idle' // paused / nothing to do

/** Which model role a cost line or override applies to. */
export type ModelRole = 'coding' | 'review' | 'architecture' | 'docs'

export interface Project {
  id: string
  name: string
  host: GitHost
  repoPath: string // e.g. "github.com/acme/payments-service"
  description: string
  state: AgentState
  /** Human-readable "what the agent is doing now", shown in the roster + live panel. */
  operation: string
  /** Branch the current operation targets, if any. */
  branch?: string
  /** Seconds the current operation has been running, if active. */
  elapsedSeconds?: number
}

export interface Issue {
  id: string // "#88"
  title: string
  author: string
  comments: number
  ageLabel: string // "6h ago"
  state: 'fixing' | 'queued' | 'attention' | 'open'
  labels: string[]
  /** Estimated or actual cost to fix, in USD. */
  costUsd: number
  costIsEstimate: boolean
}

export interface PullRequest {
  id: string // "#142"
  title: string
  detail: string // "fix-webhook-retry → main · +84 −22 · checks passing"
  state: 'review' | 'changes-requested' | 'ready' | 'merged'
  labels: string[]
  costUsd: number
  aiAuthored: boolean
}

export interface ModelSpend {
  role: ModelRole
  model: string // "claude-opus-4-8"
  requests: number
  tokens: number // total tokens
  costUsd: number
}

export interface ProjectCosts {
  monthSpendUsd: number
  budgetUsd: number
  byRole: { coding: number; review: number; architecture: number; docs: number }
  byModel: ModelSpend[]
  /** Daily spend for a sparkline, oldest → newest. */
  dailyUsd: number[]
}

export interface ActivityEntry {
  timeLabel: string // "2m ago"
  kind: 'open' | 'review' | 'merge' | 'pickup' | 'docs'
  text: string // may contain a single **bold** span
}

/**
 * How a provider authenticates and which wire protocol it speaks.
 * - `anthropic-subscription`: the user's Claude Plan (Pro/Max), no key — login at run time.
 * - `anthropic-api`: Anthropic Messages API with an `sk-ant-…` key, billed per token.
 * - `openai-compatible`: any endpoint exposing the OpenAI chat-completions API
 *   (vLLM, OpenRouter, Together, LM Studio, Azure OpenAI, etc.) — needs a base URL.
 */
export type ProviderKind = 'anthropic-subscription' | 'anthropic-api' | 'openai-compatible'

export interface Provider {
  id: string
  /** User-facing label, e.g. "Claude Plan", "OpenRouter", "Local vLLM". */
  name: string
  kind: ProviderKind
  /** Required for `openai-compatible`; optional override for `anthropic-api`. */
  baseUrl: string
  /** Empty for `anthropic-subscription` (uses login instead). */
  apiKey: string
  /** Model IDs this provider exposes, in the order shown to the user. */
  models: string[]
}

/** A model-role assignment points at one model on one configured provider. */
export interface RoleAssignment {
  providerId: string
  model: string
}

export interface Settings {
  githubToken: string
  gitlabToken: string
  providers: Provider[]
  roles: Record<ModelRole, RoleAssignment>
}

/** A repository as listed by a host, with the host-specific key used in later calls. */
export interface HostRepo {
  /** Host-specific identifier: "owner/repo" for GitHub, encoded path/id for GitLab. */
  key: string
  fullName: string // display, e.g. "acme/payments-service"
  defaultBranch: string
  description: string
}

/** A repository the user has added to the app (persisted). */
export interface ProjectRef {
  id: string
  host: GitHost
  key: string
  fullName: string
  description: string
}

/** Non-secret connection status for a host (never carries the token). */
export interface ConnectionStatus {
  host: GitHost
  connected: boolean
  login?: string
  baseUrl: string
}

/** The shape exposed to the renderer over the preload bridge. */
export interface AiCoderApi {
  getProjects: () => Promise<Project[]>
  getIssues: (projectId: string) => Promise<Issue[]>
  getPullRequests: (projectId: string) => Promise<PullRequest[]>
  getCosts: (projectId: string) => Promise<ProjectCosts>
  getActivity: (projectId: string) => Promise<ActivityEntry[]>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>

  // Host connections (Milestone 2)
  listConnections: () => Promise<ConnectionStatus[]>
  setConnection: (host: GitHost, token: string, baseUrl: string) => Promise<ConnectionStatus>
  clearConnection: (host: GitHost) => Promise<void>
  listRepos: (host: GitHost) => Promise<HostRepo[]>
  addProject: (host: GitHost, key: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}
