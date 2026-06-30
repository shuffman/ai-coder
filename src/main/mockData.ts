// Milestone-1 mock data. This is the seam where the real GitHub/GitLab + agent
// services will plug in later — the renderer only ever sees these shapes.
import type {
  Project,
  Issue,
  PullRequest,
  ProjectCosts,
  ActivityEntry
} from '../shared/types'

export const projects: Project[] = [
  {
    id: 'payments-service',
    name: 'payments-service',
    host: 'github',
    repoPath: 'github.com/acme/payments-service',
    description:
      'Stripe-backed billing and webhook handling for the platform. The coding agent owns issue triage, fixes, and pull requests; you review and merge.',
    state: 'working',
    operation: 'Authoring pull request on fix-webhook-retry',
    branch: 'fix-webhook-retry',
    elapsedSeconds: 42
  },
  {
    id: 'marketing-site',
    name: 'marketing-site',
    host: 'gitlab',
    repoPath: 'gitlab.com/acme/marketing-site',
    description: 'Public marketing site and blog.',
    state: 'reviewing',
    operation: 'Reviewing PR #54'
  },
  {
    id: 'internal-dashboard',
    name: 'internal-dashboard',
    host: 'github',
    repoPath: 'github.com/acme/internal-dashboard',
    description: 'Internal ops dashboard.',
    state: 'attention',
    operation: '3 issues need you'
  },
  {
    id: 'mobile-api',
    name: 'mobile-api',
    host: 'github',
    repoPath: 'github.com/acme/mobile-api',
    description: 'Backend API for the mobile apps.',
    state: 'clear',
    operation: 'All clear'
  },
  {
    id: 'data-pipeline',
    name: 'data-pipeline',
    host: 'gitlab',
    repoPath: 'gitlab.com/acme/data-pipeline',
    description: 'Nightly ETL and reporting jobs.',
    state: 'idle',
    operation: 'Paused'
  },
  {
    id: 'docs-portal',
    name: 'docs-portal',
    host: 'gitlab',
    repoPath: 'gitlab.com/acme/docs-portal',
    description: 'Developer documentation portal.',
    state: 'clear',
    operation: 'Docs synced 2h ago'
  }
]

const issuesByProject: Record<string, Issue[]> = {
  'payments-service': [
    {
      id: '#88',
      title: 'Timeout on large webhook payloads',
      author: '@maria',
      comments: 4,
      ageLabel: '6h ago',
      state: 'fixing',
      labels: ['agent fixing', 'bug', 'priority: high'],
      costUsd: 0.4,
      costIsEstimate: true
    },
    {
      id: '#91',
      title: 'Add idempotency keys to charge endpoint',
      author: '@maria',
      comments: 1,
      ageLabel: '1d ago',
      state: 'fixing',
      labels: ['agent fixing', 'enhancement'],
      costUsd: 0.65,
      costIsEstimate: true
    },
    {
      id: '#85',
      title: 'Flaky test in refund_test.py',
      author: '@dev',
      comments: 0,
      ageLabel: '2d ago',
      state: 'queued',
      labels: ['test', 'good first issue'],
      costUsd: 0,
      costIsEstimate: true
    },
    {
      id: '#82',
      title: 'Decide retry policy for disputed charges',
      author: '@maria',
      comments: 6,
      ageLabel: '3d ago',
      state: 'attention',
      labels: ['needs your call', 'design'],
      costUsd: 0,
      costIsEstimate: true
    },
    {
      id: '#79',
      title: 'Document webhook signature verification',
      author: '@dev',
      comments: 2,
      ageLabel: '4d ago',
      state: 'queued',
      labels: ['docs'],
      costUsd: 0,
      costIsEstimate: true
    }
  ]
}

const pullsByProject: Record<string, PullRequest[]> = {
  'payments-service': [
    {
      id: '#142',
      title: 'Fix webhook retry backoff',
      detail: 'fix-webhook-retry → main · +84 −22 · checks passing',
      state: 'review',
      labels: ['agent authored', 'review requested', 'checks green'],
      costUsd: 0.38,
      aiAuthored: true
    },
    {
      id: '#141',
      title: 'Refactor charge service for idempotency',
      detail: 'review agent requested 2 changes · agent reworking',
      state: 'changes-requested',
      labels: ['agent authored', 'changes requested'],
      costUsd: 0.71,
      aiAuthored: true
    },
    {
      id: '#140',
      title: 'Bump Stripe SDK to v12',
      detail: 'opened by @dev · approved by review agent · checks passing',
      state: 'ready',
      labels: ['approved', 'checks green'],
      costUsd: 0.12,
      aiAuthored: false
    }
  ]
}

const costsByProject: Record<string, ProjectCosts> = {
  'payments-service': {
    monthSpendUsd: 62.4,
    budgetUsd: 150,
    byRole: { coding: 41.1, review: 13.8, architecture: 4.0, docs: 3.5 },
    byModel: [
      {
        role: 'coding',
        model: 'claude-opus-4-8',
        requests: 312,
        tokens: 4_200_000,
        costUsd: 41.1
      },
      {
        role: 'review',
        model: 'claude-sonnet-4-6',
        requests: 88,
        tokens: 1_900_000,
        costUsd: 13.8
      },
      {
        role: 'docs',
        model: 'claude-haiku-4-5',
        requests: 54,
        tokens: 1_100_000,
        costUsd: 7.5
      }
    ],
    dailyUsd: [1.2, 2.0, 1.6, 2.7, 2.3, 1.4, 3.1, 2.1, 3.5, 2.5, 1.9, 2.9, 2.3, 4.18]
  }
}

const activityByProject: Record<string, ActivityEntry[]> = {
  'payments-service': [
    {
      timeLabel: '0:42 ago',
      kind: 'open',
      text: 'Opened PR **#142 — Fix webhook retry backoff** on fix-webhook-retry'
    },
    {
      timeLabel: '18m ago',
      kind: 'review',
      text: 'Reviewed **PR #141** and requested 2 changes'
    },
    {
      timeLabel: '1h ago',
      kind: 'pickup',
      text: 'Picked up issue **#88 — Timeout on large payloads**'
    },
    {
      timeLabel: '3h ago',
      kind: 'merge',
      text: 'Merged **PR #139 — Update README & API docs**'
    },
    {
      timeLabel: '5h ago',
      kind: 'docs',
      text: 'Refreshed architecture notes for the billing module'
    }
  ]
}

const emptyCosts: ProjectCosts = {
  monthSpendUsd: 0,
  budgetUsd: 150,
  byRole: { coding: 0, review: 0, architecture: 0, docs: 0 },
  byModel: [],
  dailyUsd: [0, 0, 0, 0, 0, 0, 0]
}

export function getIssues(projectId: string): Issue[] {
  return issuesByProject[projectId] ?? []
}
export function getPullRequests(projectId: string): PullRequest[] {
  return pullsByProject[projectId] ?? []
}
export function getCosts(projectId: string): ProjectCosts {
  return costsByProject[projectId] ?? emptyCosts
}
export function getActivity(projectId: string): ActivityEntry[] {
  return activityByProject[projectId] ?? []
}
