import React from 'react'
import type { Project } from '../../../shared/types'
import { hostTag, clock } from '../lib/format'

interface Props {
  projects: Project[]
  currentId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}

export function Roster({ projects, currentId, onSelect, onAdd }: Props): React.ReactElement {
  return (
    <aside className="roster">
      <div className="roster-head">
        <span className="eyebrow">Fleet</span>
        <button className="add" title="Add project" aria-label="Add project" onClick={onAdd}>
          +
        </button>
      </div>
      <nav className="stations">
        {projects.map((p) => {
          const showTimer = p.state === 'working' && p.elapsedSeconds != null
          const opText = showTimer
            ? `${shortOp(p.operation)} · ${clock(p.elapsedSeconds!)}`
            : shortOp(p.operation)
          return (
            <button
              key={p.id}
              className={'station' + (p.id === currentId ? ' is-current' : '')}
              onClick={() => onSelect(p.id)}
            >
              <span className="lamp" data-state={p.state} />
              <span className="who">
                <span className="repo">{p.name}</span>
                <span className={'op ' + p.state}>
                  {opText}
                  {(p.state === 'working' ||
                    p.state === 'reviewing' ||
                    p.state === 'authoring') && <span className="cur" />}
                </span>
              </span>
              <span className="host">{hostTag(p.host)}</span>
            </button>
          )
        })}
      </nav>
      <div className="roster-foot">
        <span>{projects.length} stations</span>
        <span>
          all hosts <b>online</b>
        </span>
      </div>
    </aside>
  )
}

/** Trim the roster op to its essence so it fits one line. */
function shortOp(op: string): string {
  return op.replace(/^Authoring pull request on .*/, 'authoring PR').replace(/\.$/, '').toLowerCase()
}
