import type { AgentEngine, EngineAuth, EngineResult, EngineRunOptions } from './types'

// The agent may edit/read/search files and run bash, but must NOT push or touch
// git remotes — the app owns the push + PR step so credentials stay controlled.
const ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep']
const DISALLOWED_TOOLS = [
  'Bash(git push:*)',
  'Bash(git remote:*)',
  'Bash(rm -rf:*)',
  'Bash(sudo:*)'
]

const SYSTEM_APPEND =
  'You are fixing a single issue in this repository. Investigate, make a focused ' +
  'change, and commit locally with a clear message. Do NOT push, open a pull ' +
  'request, or modify git remotes — that is handled for you.'

/** Applies auth to the environment the SDK reads. Subscription and API key are
 *  mutually exclusive, so we clear the other one to avoid a 401 conflict. */
function applyAuthEnv(auth: EngineAuth): void {
  if (auth.kind === 'subscription') {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = auth.oauthToken
    delete process.env.ANTHROPIC_API_KEY
  } else {
    process.env.ANTHROPIC_API_KEY = auth.apiKey
    if (auth.baseUrl) process.env.ANTHROPIC_BASE_URL = auth.baseUrl
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  }
}

export class ClaudeAgentEngine implements AgentEngine {
  readonly id = 'claude-agent-sdk'

  async run(opts: EngineRunOptions): Promise<EngineResult> {
    applyAuthEnv(opts.auth)

    // Non-literal specifier: keeps this an external runtime dependency so the
    // build never tries to bundle the SDK's native binary.
    const pkg: string = '@anthropic-ai/claude-agent-sdk'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sdk: any
    try {
      sdk = await import(pkg)
    } catch {
      return {
        ok: false,
        costUsd: 0,
        error:
          'The Claude Agent SDK is not installed. Run `npm install` (it bundles the agent binary).'
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = sdk.query({
      prompt: opts.prompt,
      options: {
        cwd: opts.cwd,
        model: opts.model,
        allowedTools: ALLOWED_TOOLS,
        disallowedTools: DISALLOWED_TOOLS,
        permissionMode: 'bypassPermissions',
        systemPrompt: { type: 'preset', preset: 'claude_code', append: SYSTEM_APPEND }
      }
    })

    const onAbort = (): void => {
      try {
        q.interrupt?.()
      } catch {
        /* ignore */
      }
    }
    opts.signal.addEventListener('abort', onAbort, { once: true })

    let costUsd = 0
    let ok = false
    let error: string | undefined

    try {
      for await (const msg of q) {
        if (opts.signal.aborted) break
        switch (msg?.type) {
          case 'assistant': {
            const text = extractText(msg?.message?.content)
            if (text) opts.log({ kind: 'agent', text: truncate(text) })
            break
          }
          case 'tool_use':
            opts.log({ kind: 'tool', text: describeTool(msg?.tool_use ?? msg) })
            break
          case 'result': {
            costUsd = Number(msg?.total_cost_usd ?? 0)
            ok = msg?.subtype === 'success'
            if (!ok) error = `Agent ended: ${msg?.subtype ?? 'unknown'}`
            opts.log({ kind: 'result', text: `Agent finished (${msg?.subtype ?? 'done'})` })
            break
          }
          default:
            break
        }
      }
    } catch (e) {
      error = (e as Error).message
      ok = false
    } finally {
      opts.signal.removeEventListener('abort', onAbort)
    }

    if (opts.signal.aborted) return { ok: false, costUsd, error: 'Cancelled' }
    return { ok, costUsd, error }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => (b?.type === 'text' ? b.text : ''))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeTool(tool: any): string {
  const name = tool?.name ?? 'tool'
  const input = tool?.input ?? {}
  const detail = input.command ?? input.file_path ?? input.path ?? input.pattern ?? ''
  return detail ? `${name}: ${truncate(String(detail), 120)}` : name
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}
