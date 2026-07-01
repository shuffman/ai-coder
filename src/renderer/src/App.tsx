import React, { useEffect, useState } from 'react'
import type {
  ActivityEntry,
  AgentRun,
  Issue,
  Project,
  ProjectCosts,
  PullRequest,
  Settings
} from '../../shared/types'
import { CommandBar } from './components/CommandBar'
import { Roster } from './components/Roster'
import { AddProject } from './components/AddProject'
import { RunPanel } from './components/RunPanel'
import { ProjectHeader, type Tab } from './components/ProjectHeader'
import { Overview } from './components/views/Overview'
import { Issues } from './components/views/Issues'
import { Pulls } from './components/views/Pulls'
import { Costs } from './components/views/Costs'
import { SettingsView } from './components/views/SettingsView'

const HERE: Record<Tab, string> = {
  overview: 'payments-service',
  issues: 'issues',
  pulls: 'pull requests',
  costs: 'costs'
}

export default function App(): React.ReactElement {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)

  const [issues, setIssues] = useState<Issue[]>([])
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [costs, setCosts] = useState<ProjectCosts | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [dataError, setDataError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null)

  // Tag the body so CSS can offset the macOS traffic lights.
  useEffect(() => {
    if (window.platform === 'darwin') document.body.classList.add('mac')
  }, [])

  // Initial load.
  useEffect(() => {
    void (async () => {
      const [ps, st] = await Promise.all([window.aicoder.getProjects(), window.aicoder.getSettings()])
      setProjects(ps)
      setSettings(st)
      if (ps.length > 0) setCurrentId(ps[0].id)
    })()
  }, [])

  // Load per-project data whenever the selection changes. Real (host-backed)
  // projects make network calls here, so handle loading + errors.
  useEffect(() => {
    if (!currentId) return
    let cancelled = false
    setLoading(true)
    setDataError('')
    void (async () => {
      try {
        const [i, p, c, a] = await Promise.all([
          window.aicoder.getIssues(currentId),
          window.aicoder.getPullRequests(currentId),
          window.aicoder.getCosts(currentId),
          window.aicoder.getActivity(currentId)
        ])
        if (cancelled) return
        setIssues(i)
        setPulls(p)
        setCosts(c)
        setActivity(a)
      } catch (e) {
        if (cancelled) return
        setDataError((e as Error).message)
        setIssues([])
        setPulls([])
        setActivity([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentId])

  // Live agent-run updates from the main process.
  useEffect(() => {
    const unsub = window.aicoder.onRunUpdate((run) => {
      setActiveRun((prev) => (prev && prev.id === run.id ? run : prev))
      if (run.status === 'succeeded' && run.projectId === currentId) {
        void (async () => {
          setIssues(await window.aicoder.getIssues(currentId))
          setPulls(await window.aicoder.getPullRequests(currentId))
        })()
      }
    })
    return unsub
  }, [currentId])

  async function startFix(issue: Issue): Promise<void> {
    if (!currentId) return
    const run = await window.aicoder.startRun(currentId, issue.id, issue.title)
    setActiveRun(run)
  }

  async function refreshProjects(selectId?: string): Promise<void> {
    const ps = await window.aicoder.getProjects()
    setProjects(ps)
    if (selectId) setCurrentId(selectId)
    else if (ps.length > 0 && !ps.some((p) => p.id === currentId)) setCurrentId(ps[0].id)
  }

  const current = projects.find((p) => p.id === currentId) ?? null

  function selectProject(id: string): void {
    setCurrentId(id)
    setTab('overview')
    setSettingsOpen(false)
  }

  async function saveSettings(next: Settings): Promise<void> {
    const saved = await window.aicoder.saveSettings(next)
    setSettings(saved)
    setSettingsOpen(false)
  }

  return (
    <>
      <CommandBar
        projects={projects}
        settingsActive={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="shell">
        <Roster
          projects={projects}
          currentId={settingsOpen ? null : currentId}
          onSelect={selectProject}
          onAdd={() => setAddOpen(true)}
        />

        {settingsOpen && settings ? (
          <SettingsView initial={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />
        ) : current && costs ? (
          <main className="console">
            <ProjectHeader
              project={current}
              here={tab === 'overview' ? current.name : HERE[tab]}
              tab={tab}
              issueCount={issues.length}
              prCount={pulls.length}
              onTab={setTab}
            />
            <div className="console-body">
              {dataError && <div className="form-error" style={{ marginBottom: 16 }}>{dataError}</div>}
              {loading && !dataError && <div className="hint-line" style={{ marginBottom: 16 }}>Loading…</div>}
              {tab === 'overview' && (
                <Overview
                  project={current}
                  issues={issues}
                  pulls={pulls}
                  costs={costs}
                  activity={activity}
                />
              )}
              {tab === 'issues' && (
                <Issues
                  issues={issues}
                  onFix={current && !current.demo ? (i) => void startFix(i) : undefined}
                />
              )}
              {tab === 'pulls' && <Pulls pulls={pulls} />}
              {tab === 'costs' && <Costs costs={costs} />}
            </div>
          </main>
        ) : (
          <main className="console">
            <div className="console-body">
              <p className="desc">Loading…</p>
            </div>
          </main>
        )}
      </div>
      {addOpen && (
        <AddProject
          onClose={() => setAddOpen(false)}
          onAdded={(project) => {
            setAddOpen(false)
            void refreshProjects(project.id)
          }}
        />
      )}
      {activeRun && (
        <RunPanel
          run={activeRun}
          onCancel={() => void window.aicoder.cancelRun(activeRun.id)}
          onClose={() => setActiveRun(null)}
        />
      )}
    </>
  )
}
