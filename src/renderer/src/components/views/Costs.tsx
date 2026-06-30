import React from 'react'
import type { ProjectCosts } from '../../../../shared/types'
import { usd } from '../../lib/format'

const ROLE_LABEL: Record<string, string> = {
  coding: 'coding',
  review: 'code review',
  architecture: 'architecture',
  docs: 'documentation'
}

export function Costs({ costs }: { costs: ProjectCosts }): React.ReactElement {
  const pct = Math.round((costs.monthSpendUsd / costs.budgetUsd) * 100)
  const total = costs.monthSpendUsd || 1
  const peak = Math.max(...costs.dailyUsd, 1)

  const share = (n: number): string => Math.round((n / total) * 100) + '% of spend'

  return (
    <>
      <section className="instruments">
        <div className="inst">
          <div className="lbl">Spend · month</div>
          <div className="val amber">{usd(costs.monthSpendUsd)}</div>
          <div className="meter">
            <div
              className={'meter-fill' + (pct > 100 ? ' over' : '')}
              style={{ width: Math.min(pct, 100) + '%' }}
            />
          </div>
          <div className="sub">
            {pct}% of {usd(costs.budgetUsd)} cap
          </div>
        </div>
        <div className="inst">
          <div className="lbl">Coding</div>
          <div className="val">{usd(costs.byRole.coding)}</div>
          <div className="sub">{share(costs.byRole.coding)}</div>
        </div>
        <div className="inst">
          <div className="lbl">Code review</div>
          <div className="val">{usd(costs.byRole.review)}</div>
          <div className="sub">{share(costs.byRole.review)}</div>
        </div>
        <div className="inst">
          <div className="lbl">Docs + arch</div>
          <div className="val">{usd(costs.byRole.docs + costs.byRole.architecture)}</div>
          <div className="sub">{share(costs.byRole.docs + costs.byRole.architecture)}</div>
        </div>
      </section>

      <div className="sect">
        <h2>By model role</h2>
        <span className="rule" />
      </div>
      <div className="records">
        {costs.byModel.map((m) => (
          <article className="rec" key={m.model}>
            <span className="num">{m.role.slice(0, 4)}</span>
            <span className="main">
              <div className="h">{m.model}</div>
              <div className="meta">
                {ROLE_LABEL[m.role] ?? m.role} agent · {m.requests} requests ·{' '}
                {(m.tokens / 1_000_000).toFixed(1)}M tokens
              </div>
            </span>
            <span className="right">
              <span className="cost">{usd(m.costUsd)}</span>
              this month
            </span>
          </article>
        ))}
        {costs.byModel.length === 0 && (
          <div className="rec">
            <span className="num" />
            <span className="main">
              <div className="meta">No spend recorded yet.</div>
            </span>
            <span className="right" />
          </div>
        )}
      </div>

      <div className="sect spaced">
        <h2>Daily spend · last {costs.dailyUsd.length} days</h2>
        <span className="rule" />
      </div>
      <div className="bars">
        {costs.dailyUsd.map((d, i) => (
          <div
            key={i}
            className={'bar' + (i === costs.dailyUsd.length - 1 ? ' last' : '')}
            style={{ height: Math.max((d / peak) * 100, 4) + '%' }}
            title={usd(d)}
          />
        ))}
      </div>
    </>
  )
}
