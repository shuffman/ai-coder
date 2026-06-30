import React from 'react'
import type { Project } from '../../../shared/types'
import { chipClass, stateLabel } from '../lib/format'

export type Tab = 'overview' | 'issues' | 'pulls' | 'costs'

interface Props {
  project: Project
  here: string
  tab: Tab
  issueCount: number
  prCount: number
  onTab: (tab: Tab) => void
}

export function ProjectHeader({
  project,
  here,
  tab,
  issueCount,
  prCount,
  onTab
}: Props): React.ReactElement {
  return (
    <div className="console-head">
      <div className="crumb">
        fleet / {project.name} / <span className="here">{here}</span>
      </div>
      <div className="title-row">
        <h1>{project.name}</h1>
        <span className={'chip ' + chipClass(project.state)}>
          <span className="pip" />
          {stateLabel(project.state)}
        </span>
        <span className="repo-path">{project.repoPath}</span>
      </div>
      <p className="desc">{project.description}</p>
      <nav className="tabs">
        <button className={'tab' + (tab === 'overview' ? ' is-active' : '')} onClick={() => onTab('overview')}>
          Overview
        </button>
        <button className={'tab' + (tab === 'issues' ? ' is-active' : '')} onClick={() => onTab('issues')}>
          Issues<span className="ct">{issueCount}</span>
        </button>
        <button className={'tab' + (tab === 'pulls' ? ' is-active' : '')} onClick={() => onTab('pulls')}>
          Pull requests<span className="ct">{prCount}</span>
        </button>
        <button className={'tab' + (tab === 'costs' ? ' is-active' : '')} onClick={() => onTab('costs')}>
          Costs
        </button>
      </nav>
    </div>
  )
}
