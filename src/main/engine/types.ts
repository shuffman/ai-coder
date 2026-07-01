import type { RunLogLine } from '../../shared/types'

export type EngineAuth =
  | { kind: 'subscription'; oauthToken: string } // Claude Plan via `claude setup-token`
  | { kind: 'api-key'; apiKey: string; baseUrl?: string }

export interface EngineRunOptions {
  cwd: string
  prompt: string
  model: string
  auth: EngineAuth
  signal: AbortSignal
  log: (line: Omit<RunLogLine, 'ts'>) => void
}

export interface EngineResult {
  ok: boolean
  costUsd: number
  error?: string
}

/** Turns a model + working directory into applied code changes. */
export interface AgentEngine {
  readonly id: string
  run(opts: EngineRunOptions): Promise<EngineResult>
}
