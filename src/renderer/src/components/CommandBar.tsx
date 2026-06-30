import React from 'react'
import type { Project } from '../../../shared/types'
import { usd } from '../lib/format'

interface Props {
  projects: Project[]
  onOpenSettings: () => void
  settingsActive: boolean
}

export function CommandBar({ projects, onOpenSettings, settingsActive }: Props): React.ReactElement {
  const active = projects.filter(
    (p) => p.state === 'working' || p.state === 'reviewing' || p.state === 'authoring'
  ).length
  const needsYou = projects.filter((p) => p.state === 'attention').length
  // Mock "spent today" — sums nothing real yet; fixed for milestone 1.
  const spentToday = 4.18

  return (
    <header className="commandbar">
      <div className="brand">
        <span className="mark">A</span>
        <span className="name">
          <b>AI</b>·Coder
        </span>
      </div>
      <div className="fleet">
        <span className="stat">
          <span className="n">{projects.length}</span>
          <span className="lbl">projects</span>
        </span>
        <span className="stat is-live">
          <span className="n">{active}</span>
          <span className="lbl">agents active</span>
        </span>
        <span className="stat alert">
          <span className="n">{needsYou}</span>
          <span className="lbl">needs you</span>
        </span>
        <span className="stat">
          <span className="n">{usd(spentToday)}</span>
          <span className="lbl">spent today</span>
        </span>
      </div>
      <span className="spacer" />
      <button
        className={'iconbtn' + (settingsActive ? ' is-active' : '')}
        title="Settings"
        aria-label="Settings"
        onClick={onOpenSettings}
      >
        ⚙
      </button>
    </header>
  )
}
