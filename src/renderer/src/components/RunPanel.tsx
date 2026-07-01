import React, { useEffect, useRef } from 'react'
import type { AgentRun, RunStatus } from '../../../shared/types'
import { usd } from '../lib/format'

interface Props {
  run: AgentRun
  onCancel: () => void
  onClose: () => void
}

const STATUS: Record<RunStatus, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'idle' },
  preparing: { label: 'Preparing', cls: 'working' },
  working: { label: 'Agent working', cls: 'working' },
  pushing: { label: 'Pushing', cls: 'working' },
  'opening-pr': { label: 'Opening PR', cls: 'authoring' },
  succeeded: { label: 'PR opened', cls: 'clear' },
  failed: { label: 'Failed', cls: 'attention' },
  cancelled: { label: 'Cancelled', cls: 'idle' }
}

const ACTIVE: RunStatus[] = ['queued', 'preparing', 'working', 'pushing', 'opening-pr']

export function RunPanel({ run, onCancel, onClose }: Props): React.ReactElement {
  const logRef = useRef<HTMLDivElement>(null)
  const running = ACTIVE.includes(run.status)
  const s = STATUS[run.status]

  // Keep the log scrolled to the newest line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [run.logs.length])

  return (
    <div className="overlay" onClick={running ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            Fix {run.issueId} <span className="run-title">{run.issueTitle}</span>
          </h2>
          <span className={'chip ' + s.cls}>
            <span className="pip" />
            {s.label}
          </span>
        </div>

        <div className="modal-body">
          <div className="run-meta">
            <span>
              branch <b>{run.branch}</b>
            </span>
            <span>
              cost <b className="run-cost">{usd(run.costUsd)}</b>
            </span>
          </div>

          <div className="run-log" ref={logRef}>
            {run.logs.length === 0 && <div className="log-line info">Starting…</div>}
            {run.logs.map((l, i) => (
              <div key={i} className={'log-line ' + l.kind}>
                {l.text}
              </div>
            ))}
          </div>

          {run.error && <div className="form-error" style={{ marginTop: 14 }}>{run.error}</div>}

          {run.prUrl && (
            <a className="btn primary run-pr" href={run.prUrl} target="_blank" rel="noreferrer">
              View pull request ↗
            </a>
          )}
        </div>

        <div className="set-actions">
          {running ? (
            <button className="btn danger" onClick={onCancel}>
              Cancel run
            </button>
          ) : (
            <button className="btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
