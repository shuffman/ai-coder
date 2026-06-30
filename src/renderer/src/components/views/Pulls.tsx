import React from 'react'
import type { PullRequest } from '../../../../shared/types'
import { usd } from '../../lib/format'
import { tagClass } from '../../lib/tags'

const DOT: Record<PullRequest['state'], { color: string; glow: boolean }> = {
  review: { color: 'var(--authoring)', glow: true },
  'changes-requested': { color: 'var(--reviewing)', glow: true },
  ready: { color: 'var(--clear)', glow: false },
  merged: { color: 'var(--idle)', glow: false }
}

function Row({ pr }: { pr: PullRequest }): React.ReactElement {
  const dot = DOT[pr.state]
  return (
    <article className="rec">
      <span className="num">{pr.id}</span>
      <span className="main">
        <div className="h">
          <span
            className="lampdot"
            style={{ background: dot.color, boxShadow: dot.glow ? `0 0 8px ${dot.color}` : 'none' }}
          />
          {pr.title}
        </div>
        <div className="meta">{pr.detail}</div>
        <div className="tags">
          {pr.labels.map((l) => (
            <span key={l} className={'tg ' + tagClass(l)}>
              {l}
            </span>
          ))}
        </div>
      </span>
      <span className="right">
        <span className="cost">{usd(pr.costUsd)}</span>
        spent
      </span>
    </article>
  )
}

const SECTIONS: { key: PullRequest['state']; title: string }[] = [
  { key: 'review', title: 'Waiting on you' },
  { key: 'changes-requested', title: 'In progress' },
  { key: 'ready', title: 'Ready to merge' }
]

export function Pulls({ pulls }: { pulls: PullRequest[] }): React.ReactElement {
  return (
    <>
      {SECTIONS.map((s, idx) => {
        const items = pulls.filter((p) => p.state === s.key)
        if (items.length === 0) return null
        return (
          <React.Fragment key={s.key}>
            <div className={'sect' + (idx > 0 ? ' spaced' : '')}>
              <h2>
                {s.title} · {items.length}
              </h2>
              <span className="rule" />
            </div>
            <div className="records">
              {items.map((p) => (
                <Row key={p.id} pr={p} />
              ))}
            </div>
          </React.Fragment>
        )
      })}
      {pulls.length === 0 && (
        <div className="records">
          <div className="rec">
            <span className="num" />
            <span className="main">
              <div className="meta">No open pull requests.</div>
            </span>
            <span className="right" />
          </div>
        </div>
      )}
    </>
  )
}
