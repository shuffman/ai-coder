import type { AgentState } from '../../../shared/types'

export function usd(n: number): string {
  return '$' + n.toFixed(2)
}

export function hostTag(host: string): string {
  return host === 'github' ? 'GH' : 'GL'
}

/** mm:ss from seconds */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const STATE_LABEL: Record<AgentState, string> = {
  working: 'WORKING',
  reviewing: 'REVIEWING',
  authoring: 'AUTHORING',
  attention: 'NEEDS YOU',
  clear: 'ALL CLEAR',
  idle: 'IDLE'
}
export function stateLabel(state: AgentState): string {
  return STATE_LABEL[state]
}

/** Chip color class for a state (some states collapse to a shared swatch). */
export function chipClass(state: AgentState): string {
  if (state === 'attention') return 'attention'
  if (state === 'reviewing') return 'reviewing'
  if (state === 'authoring') return 'authoring'
  if (state === 'clear') return 'clear'
  if (state === 'idle') return 'idle'
  return 'working'
}
