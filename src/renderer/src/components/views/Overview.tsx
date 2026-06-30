import React from 'react'
import type { ActivityEntry, Issue, Project, ProjectCosts, PullRequest } from '../../../../shared/types'
import { clock, usd } from '../../lib/format'
import { Bold } from '../../lib/Bold'

interface Props {
  project: Project
  issues: Issue[]
  pulls: PullRequest[]
  costs: ProjectCosts
  activity: ActivityEntry[]
}

export function Overview({ project, issues, pulls, costs, activity }: Props): React.ReactElement {
  const fixing = issues.filter((i) => i.state === 'fixing').length
  const awaiting = pulls.filter((p) => p.state === 'review').length
  const budgetPct = Math.round((costs.monthSpendUsd / costs.budgetUsd) * 100)
  const isActive =
    project.state === 'working' || project.state === 'reviewing' || project.state === 'authoring'

  return (
    <>
      {isActive && (
        <section className="live">
          <div className="live-top">
            <span className="eyebrow">● Right now</span>
            {project.elapsedSeconds != null && (
              <span className="since">started {clock(project.elapsedSeconds)} ago</span>
            )}
          </div>
          <div className="readout">
            <span className="arrow">▸</span>
            <span>{liveLead(project.operation, project.branch)}</span>
            {project.branch && <span className="branch">{project.branch}</span>}
            {project.elapsedSeconds != null && (
              <span className="timer">{clock(project.elapsedSeconds)}</span>
            )}
            <span className="cur" />
          </div>
          <div className="substep">
            └ writing exponential backoff for failed webhook deliveries · 84 lines staged across 3 files
          </div>
          <div className="live-actions">
            <button className="btn">Watch live log</button>
            <button className="btn ghost">Send a note to the agent</button>
            <button className="btn danger">Pause project</button>
          </div>
        </section>
      )}

      <section className="instruments">
        <div className="inst">
          <div className="lbl">Open issues</div>
          <div className="val">{issues.length}</div>
          <div className="sub">{fixing} being fixed now</div>
        </div>
        <div className="inst">
          <div className="lbl">Open PRs</div>
          <div className="val violet">{pulls.length}</div>
          <div className="sub">{awaiting} waiting on you</div>
        </div>
        <div className="inst">
          <div className="lbl">Spend · month</div>
          <div className="val amber">{usd(costs.monthSpendUsd)}</div>
          <div className="meter">
            <div
              className={'meter-fill' + (budgetPct > 100 ? ' over' : '')}
              style={{ width: Math.min(budgetPct, 100) + '%' }}
            />
          </div>
          <div className="sub">
            {budgetPct}% of {usd(costs.budgetUsd)} budget
          </div>
        </div>
        <div className="inst">
          <div className="lbl">Merged · 7d</div>
          <div className="val green">11</div>
          <div className="sub">+4 vs last week</div>
        </div>
      </section>

      <div className="sect">
        <h2>Activity</h2>
        <span className="rule" />
      </div>
      <div className="log">
        {activity.map((a, i) => (
          <div className="row" key={i}>
            <span className="t">{a.timeLabel}</span>
            <span className={'k ' + a.kind}>AI</span>
            <span className="m">
              <Bold text={a.text} />
            </span>
          </div>
        ))}
        {activity.length === 0 && <div className="row"><span className="t" /><span className="k" /><span className="m">No activity yet.</span></div>}
      </div>
    </>
  )
}

function liveLead(operation: string, branch?: string): string {
  if (branch && operation.includes(branch)) {
    return operation.slice(0, operation.indexOf(branch)).replace(/\s+$/, '')
  }
  return operation
}
