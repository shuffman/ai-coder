import { execFile } from 'child_process'
import { promisify } from 'util'
import { rm } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import type { GitHost, RunLogLine } from '../shared/types'

const exec = promisify(execFile)

type Log = (line: Omit<RunLogLine, 'ts'>) => void

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd, maxBuffer: 1024 * 1024 * 16 })
  return stdout.trim()
}

/** Per-run working directory under the app's userData. */
export function runDir(projectId: string, runId: string): string {
  return join(app.getPath('userData'), 'workspaces', projectId, runId)
}

/** Inject credentials into an https clone URL for a single push/clone. */
export function authUrl(cloneUrl: string, host: GitHost, token: string): string {
  const u = new URL(cloneUrl)
  u.username = host === 'github' ? 'x-access-token' : 'oauth2'
  u.password = token
  return u.toString()
}

/** Shallow-clone the base branch and cut a fresh working branch off it. */
export async function prepareBranch(opts: {
  dir: string
  authedUrl: string
  baseBranch: string
  branch: string
  log: Log
}): Promise<void> {
  const { dir, authedUrl, baseBranch, branch, log } = opts
  log({ kind: 'info', text: `Cloning ${baseBranch}…` })
  await exec('git', [
    'clone',
    '--depth',
    '1',
    '--single-branch',
    '--branch',
    baseBranch,
    authedUrl,
    dir
  ])
  await git(dir, ['checkout', '-b', branch])
  // Identify commits made by the agent run.
  await git(dir, ['config', 'user.name', 'AI-Coder'])
  await git(dir, ['config', 'user.email', 'ai-coder@local'])
  log({ kind: 'info', text: `Working on branch ${branch}` })
}

/**
 * Stage any uncommitted work the agent left, commit if needed, and push the
 * branch. Returns false if the run produced no commits (nothing to open a PR for).
 */
export async function commitAndPush(opts: {
  dir: string
  authedUrl: string
  baseBranch: string
  branch: string
  commitMessage: string
  log: Log
}): Promise<boolean> {
  const { dir, authedUrl, baseBranch, branch, commitMessage, log } = opts

  await git(dir, ['add', '-A'])
  const staged = await git(dir, ['diff', '--cached', '--name-only'])
  if (staged) {
    await git(dir, ['commit', '-m', commitMessage])
    log({ kind: 'info', text: `Committed staged changes` })
  }

  const commitCount = await git(dir, ['rev-list', '--count', `origin/${baseBranch}..HEAD`])
  if (commitCount === '0') return false

  log({ kind: 'info', text: `Pushing ${commitCount} commit(s)…` })
  await git(dir, ['push', authedUrl, `HEAD:refs/heads/${branch}`])
  return true
}

/** Best-effort cleanup of a run's working directory. */
export async function cleanupRunDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => {})
}
