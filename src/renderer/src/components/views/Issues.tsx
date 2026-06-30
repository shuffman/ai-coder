import React from 'react'
import type { Issue } from '../../../../shared/types'
import { usd } from '../../lib/format'
import { tagClass } from '../../lib/tags'

const DOT: Record<Issue['state'], { color: string; glow: boolean }> = {
  fixing: { color: 'var(--working)', glow: true },
  attention: { color: 'var(--attention)', glow: true },
  queued: { color: 'var(--idle)', glow: false },
  open: { color: 'var(--idle)', glow: false }
}

function rightLabel(issue: Issue): React.ReactNode {
  if (issue.state === 'fixing')
    return (
      <>
        <span className="cost est">~{usd(issue.costUsd)}</span>
        est. to fix
      </>
    )
  if (issue.state === 'attention') return 'held for you'
  return 'queued'
}

function Row({ issue }: { issue: Issue }): React.ReactElement {
  const dot = DOT[issue.state]
  return (
    <article className="rec">
      <span className="num">{issue.id}</span>
      <span className="main">
        <div className="h">
          <span
            className="lampdot"
            style={{ background: dot.color, boxShadow: dot.glow ? `0 0 8px ${dot.color}` : 'none' }}
          />
          {issue.title}
        </div>
        <div className="meta">
          opened {issue.ageLabel} by {issue.author} · {issue.comments} comments
        </div>
        <div className="tags">
          {issue.labels.map((l) => (
            <span key={l} className={'tg ' + tagClass(l)}>
              {l}
            </span>
          ))}
        </div>
      </span>
      <span className="right">{rightLabel(issue)}</span>
    </article>
  )
}

export function Issues({ issues }: { issues: Issue[] }): React.ReactElement {
  const fixing = issues.filter((i) => i.state === 'fixing')
  const rest = issues.filter((i) => i.state !== 'fixing')
  return (
    <>
      <div className="sect">
        <h2>Being fixed now · {fixing.length}</h2>
        <span className="rule" />
      </div>
      <div className="records">
        {fixing.map((i) => (
          <Row key={i.id} issue={i} />
        ))}
        {fixing.length === 0 && <Empty>No issues are being fixed right now.</Empty>}
      </div>

      <div className="sect spaced">
        <h2>Queued &amp; open · {rest.length}</h2>
        <span className="rule" />
      </div>
      <div className="records">
        {rest.map((i) => (
          <Row key={i.id} issue={i} />
        ))}
        {rest.length === 0 && <Empty>Nothing else open. The agent is all caught up.</Empty>}
      </div>
    </>
  )
}

function Empty({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="rec"><span className="num" /><span className="main"><div className="meta">{children}</div></span><span className="right" /></div>
}
