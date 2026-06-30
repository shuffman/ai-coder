# AI-Coder — Implementation Plan

A desktop app that supervises a fleet of AI coding agents managing GitHub/GitLab
repositories: the agents write code, open and review PRs, merge, watch issues,
and keep docs current; the human reviews and steers.

This document tracks the build in milestones. Each milestone is shippable on its
own and leaves the app in a runnable state.

---

## Locked decisions

These are settled (see also `mockup/` for the agreed visual design):

| Area | Decision |
|---|---|
| **Platform** | Electron (macOS + Windows), statically built |
| **Renderer stack** | React + TypeScript + Vite (via `electron-vite`) |
| **Design language** | Instrumentation / mission-control — deep ink-blue base, a semantic signal palette where color encodes agent state, IBM Plex Mono telemetry, Space Grotesk display |
| **Default AI billing** | The user's **Claude Plan** (Pro/Max subscription) — usage draws on the subscription, not per-token API billing |
| **Providers** | Multi-provider from the start: `anthropic-subscription` (Claude Plan), `anthropic-api` (sk-ant key), and `openai-compatible` (base URL + key) for vLLM / OpenRouter / Together / LM Studio / Azure, etc. |
| **Model roles** | Four roles — coding, review, architecture, docs — each assigned a `{provider, model}` |
| **IPC contract** | Renderer talks to the main process over a typed `window.aicoder` bridge; data shapes live in `src/shared/types.ts`. Mock and real services implement the same shapes. |

## Open decisions (must resolve before the milestone that needs them)

1. **Execution engine** *(blocks M3)* — what turns a model into a coding agent
   (edits files, runs git, opens PRs). The Claude Agent SDK runs the agentic
   loop on Anthropic models only and can use the Claude Plan; OpenAI-compatible
   models cannot run through it. Options:
   - **(a)** One provider-agnostic agent harness we build and maintain (works for
     Anthropic *and* OpenAI-compatible).
   - **(b)** Per-provider engines: Agent SDK for Anthropic/Claude Plan, a separate
     loop for OpenAI-compatible.
2. ~~**First git host**~~ — RESOLVED: both GitHub and GitLab, behind one
   `GitHostAdapter` interface (built in M2).
3. **Per-project overrides** *(M5)* — whether projects can override hosts,
   providers, and model roles individually.

---

## Architecture seams (already in place)

- `src/shared/types.ts` — the domain model and the `GitHost` host-abstraction seam.
- `src/main/` — main process: window, IPC handlers, settings persistence
  (`electron-store`). Today the handlers serve `mockData.ts`; real services drop
  in behind the same handlers.
- `src/preload/` — `contextBridge` exposes the typed `AiCoderApi`.
- `src/renderer/` — React UI: `CommandBar`, `Roster`, `ProjectHeader`, and the
  Overview / Issues / Pulls / Costs / Settings views.

---

## Milestones

### ✅ Milestone 1 — UI shell + mock data  *(complete)*

Goal: a runnable app that looks and navigates like the real thing, with no live
API calls, so the UX can be reviewed and refined.

- [x] Electron + React + TS + Vite scaffold; dev (`npm run dev`), build
      (`npm run build`), type-check, and packaging (`npm run dist`) all work
- [x] Secure renderer (`contextIsolation`, preload bridge), CSP, external links
      open in the OS browser
- [x] Two-pane shell: fleet command bar, project roster with live status lamps,
      console with Overview / Issues / Pull requests / Costs tabs
- [x] Mock data served through the real IPC contract
- [x] Settings persisted to disk; **multi-provider management** (add/edit/remove
      providers) and per-role model assignment
- [x] Design ported from `mockup/` to React

**Exit criteria:** met. The app runs and is navigable end to end on mock data.

---

### Milestone 2 — Real read-only data  *(code complete; pending real-token verification)*

Goal: replace mock data with **real, read-only** data for connected repos.
No agent actions yet — just prove the host integration and data plumbing.

Decision: **both hosts**, behind one `GitHostAdapter` interface, using the REST
APIs directly via `fetch` (no SDK deps). GitHub key = `owner/repo`; GitLab key =
URL-encoded `path_with_namespace`; both support a configurable base URL
(GH Enterprise / self-hosted GitLab).

- [x] `GitHostAdapter` interface (`src/main/hosts/types.ts`) + GitHub and GitLab
      adapters: `verify`, `listRepos`, `getRepo`, `listIssues`, `listPullRequests`
- [x] Secure token storage via Electron `safeStorage` (`src/main/connections.ts`)
- [x] "Add project" flow: connect a host (token + base URL, verified), pick a repo
      (`src/renderer/src/components/AddProject.tsx`)
- [x] Main-process services serve real data behind the existing IPC handlers;
      demo mock shown until the first real project is added
- [x] Loading and error states for network calls
- [x] **Verified against a real GitLab account** — token encrypted, repos
      paginate fully, projects add and render real data
- [ ] Background refresh / polling for project status

**Exit criteria:** a real repo appears in the roster with its actual open issues
and PRs; no writes occur.

---

### Milestone 3 — First agent action (write path)

Goal: the coding agent does one real thing end to end on one provider.

- [ ] Resolve open decision #1 (execution engine)
- [ ] `AgentEngine` interface; first implementation (Claude Agent SDK on the
      Claude Plan, since that's the default billing path)
- [ ] **Claude Plan auth**: subscription login flow + secure token handling;
      API-key fallback path
- [ ] Agent run lifecycle: queue → working → output, surfaced as the live
      operation readout and roster lamp states
- [ ] One concrete capability: pick an issue → produce a fix → open a PR on a
      branch (human reviews/merges manually)
- [ ] Run logs viewable ("Watch live log"); ability to pause/cancel a run
- [ ] Real cost/usage accounting wired into the Costs view

**Exit criteria:** from the UI, hand the agent an issue and get a real PR back,
running on the Claude Plan.

---

### Milestone 4 — The full agent loop

Goal: the autonomous behaviors described in the product vision.

- [ ] Code review agent reviews PRs (approve / request changes)
- [ ] Architecture review agent for larger changes
- [ ] Documentation agent keeps docs current
- [ ] Issue watcher: auto-triage and auto-fix eligible issues
- [ ] Merge policy: when the agent may merge vs. when it must wait for the human
- [ ] Per-role model routing actually drives which provider/model each task uses
- [ ] Guardrails: budget caps that pause a project, "needs your call" gating,
      approval prompts for irreversible actions

**Exit criteria:** a project can run unattended within its budget, surfacing only
the decisions that need a human.

---

### Milestone 5 — Multi-provider execution + overrides

Goal: deliver on multi-provider for the *execution* path, not just config.

- [ ] OpenAI-compatible execution path (per open decision #1)
- [ ] Run any role on any configured provider; verify Claude Plan + an
      OpenAI-compatible endpoint side by side
- [ ] Resolve open decision #3: per-project overrides for hosts, providers, roles
- [ ] Second git host adapter (whichever wasn't built in M2)

**Exit criteria:** a project can, e.g., code on the Claude Plan and write docs on
a local OpenAI-compatible model, with per-project overrides honored.

---

### Milestone 6 — Polish, packaging, distribution

Goal: a real installable product.

- [ ] Signed/notarized macOS `.dmg` and Windows `.nsis` installer
- [ ] Auto-update
- [ ] First-run onboarding (connect a host, pick provider/auth, add first project)
- [ ] Crash/error reporting and structured logs
- [ ] Accessibility and keyboard-navigation pass
- [ ] Light theme (optional)

**Exit criteria:** a non-developer can install and use it.

---

## Cross-cutting concerns (apply across milestones)

- **Secrets:** move tokens/keys from `electron-store` to the OS keychain before
  any real credentials are entered (M2).
- **Security:** keep `contextIsolation` on; never expose Node APIs to the
  renderer; validate all IPC inputs in the main process.
- **Testing:** unit tests for host/engine adapters; smoke tests for IPC handlers.
- **Observability:** structured run logs from the first real agent action (M3).
