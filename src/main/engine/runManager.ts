import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type { AgentRun, RunLogLine, RunStatus, Settings } from '../../shared/types'
import { getSettings } from '../store'
import { getToken } from '../connections'
import { adapterFor } from '../hosts'
import { getRef } from '../projects'
import { authUrl, cleanupRunDir, commitAndPush, prepareBranch, runDir } from '../git'
import { ClaudeAgentEngine } from './claudeAgent'
import type { EngineAuth } from './types'

interface Tracked {
  run: AgentRun
  controller: AbortController
}

/** Resolve the coding role's provider into engine auth + model. */
function resolveCodingAuth(settings: Settings): { auth: EngineAuth; model: string } {
  const role = settings.roles.coding
  const provider = settings.providers.find((p) => p.id === role.providerId)
  if (!provider) throw new Error('No provider is assigned to the coding role. Check Settings.')

  if (provider.kind === 'openai-compatible') {
    throw new Error(
      'OpenAI-compatible execution is not available yet (Milestone 5). Assign the coding role to a Claude provider.'
    )
  }
  if (provider.kind === 'anthropic-subscription') {
    if (!provider.apiKey) {
      throw new Error(
        'Your Claude Plan needs a setup token. Run `claude setup-token` and paste it into the provider in Settings.'
      )
    }
    return { auth: { kind: 'subscription', oauthToken: provider.apiKey }, model: role.model }
  }
  if (!provider.apiKey) throw new Error('The Anthropic API provider needs an API key. Check Settings.')
  return {
    auth: { kind: 'api-key', apiKey: provider.apiKey, baseUrl: provider.baseUrl || undefined },
    model: role.model
  }
}

export class RunManager extends EventEmitter {
  private runs = new Map<string, Tracked>()
  private engine = new ClaudeAgentEngine()

  list(projectId: string): AgentRun[] {
    return [...this.runs.values()]
      .map((t) => t.run)
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.startedAt - a.startedAt)
  }

  cancel(runId: string): void {
    this.runs.get(runId)?.controller.abort()
  }

  start(projectId: string, issueId: string, issueTitle: string): AgentRun {
    const id = randomUUID()
    const branch = `aicoder/${issueId.replace(/[^\w.-]/g, '')}-${id.slice(0, 8)}`
    const run: AgentRun = {
      id,
      projectId,
      issueId,
      issueTitle,
      branch,
      status: 'queued',
      logs: [],
      costUsd: 0,
      startedAt: Date.now()
    }
    const controller = new AbortController()
    this.runs.set(id, { run, controller })
    this.emit('update', run)
    void this.execute(id, controller.signal)
    return run
  }

  private update(run: AgentRun, patch: Partial<AgentRun>): void {
    Object.assign(run, patch)
    this.emit('update', run)
  }

  private setStatus(run: AgentRun, status: RunStatus): void {
    this.update(run, { status })
  }

  private log(run: AgentRun, line: Omit<RunLogLine, 'ts'>): void {
    run.logs.push({ ts: Date.now(), ...line })
    this.emit('update', run)
  }

  private async execute(id: string, signal: AbortSignal): Promise<void> {
    const tracked = this.runs.get(id)!
    const { run } = tracked
    const dir = runDir(run.projectId, id)

    try {
      const ref = getRef(run.projectId)
      if (!ref) throw new Error('Project not found.')
      const token = getToken(ref.host)
      if (!token) throw new Error(`${ref.host} is not connected.`)
      const adapter = adapterFor(ref.host)
      if (!adapter) throw new Error(`${ref.host} is not connected.`)

      const { auth, model } = resolveCodingAuth(getSettings())

      this.setStatus(run, 'preparing')
      const meta = await adapter.getRepo(ref.key)
      const authed = authUrl(meta.cloneUrl, ref.host, token)
      await prepareBranch({
        dir,
        authedUrl: authed,
        baseBranch: meta.defaultBranch,
        branch: run.branch,
        log: (l) => this.log(run, l)
      })

      this.setStatus(run, 'working')
      this.log(run, { kind: 'info', text: `Running ${model} on ${run.issueId}` })
      const prompt =
        `Fix issue ${run.issueId}: ${run.issueTitle}\n\n` +
        `Investigate the repository, implement a focused fix for this issue, and commit it locally.`
      const result = await this.engine.run({
        cwd: dir,
        prompt,
        model,
        auth,
        signal,
        log: (l) => this.log(run, l)
      })
      this.update(run, { costUsd: result.costUsd })

      if (signal.aborted) {
        this.update(run, { status: 'cancelled', endedAt: Date.now() })
        return
      }
      if (!result.ok) throw new Error(result.error || 'The agent run failed.')

      this.setStatus(run, 'pushing')
      const pushed = await commitAndPush({
        dir,
        authedUrl: authed,
        baseBranch: meta.defaultBranch,
        branch: run.branch,
        commitMessage: `Fix ${run.issueId}: ${run.issueTitle}`,
        log: (l) => this.log(run, l)
      })
      if (!pushed) throw new Error('The agent made no changes, so there is nothing to open a PR for.')

      this.setStatus(run, 'opening-pr')
      const prUrl = await adapter.createPullRequest(ref.key, {
        title: `Fix ${run.issueId}: ${run.issueTitle}`,
        body: `Automated fix for ${run.issueId} — ${run.issueTitle}.\n\nCloses ${run.issueId}.\n\nOpened by AI-Coder.`,
        head: run.branch,
        base: meta.defaultBranch
      })
      this.log(run, { kind: 'result', text: `Opened ${prUrl}` })
      this.update(run, { status: 'succeeded', prUrl, endedAt: Date.now() })
    } catch (e) {
      this.log(run, { kind: 'error', text: (e as Error).message })
      this.update(run, { status: 'failed', error: (e as Error).message, endedAt: Date.now() })
    } finally {
      await cleanupRunDir(dir)
    }
  }
}

export const runManager = new RunManager()
