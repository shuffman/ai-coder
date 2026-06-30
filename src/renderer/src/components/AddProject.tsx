import React, { useEffect, useState } from 'react'
import type { ConnectionStatus, GitHost, HostRepo, Project } from '../../../shared/types'

interface Props {
  onClose: () => void
  onAdded: (project: Project) => void
}

export function AddProject({ onClose, onAdded }: Props): React.ReactElement {
  const [host, setHost] = useState<GitHost>('github')
  const [conns, setConns] = useState<ConnectionStatus[]>([])
  const conn = conns.find((c) => c.host === host)

  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  const [repos, setRepos] = useState<HostRepo[] | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState('')
  const [filter, setFilter] = useState('')
  const [addingKey, setAddingKey] = useState('')

  async function refreshConns(): Promise<ConnectionStatus[]> {
    const c = await window.aicoder.listConnections()
    setConns(c)
    return c
  }

  useEffect(() => {
    void refreshConns()
  }, [])

  // When switching host, seed the base-URL field and (if connected) load repos.
  useEffect(() => {
    setConnectError('')
    setRepoError('')
    setRepos(null)
    setFilter('')
    const c = conns.find((x) => x.host === host)
    setBaseUrl(c?.baseUrl ?? (host === 'github' ? 'https://api.github.com' : 'https://gitlab.com'))
    if (c?.connected) void loadRepos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, conns.length])

  async function loadRepos(): Promise<void> {
    setLoadingRepos(true)
    setRepoError('')
    try {
      setRepos(await window.aicoder.listRepos(host))
    } catch (e) {
      setRepoError((e as Error).message)
      setRepos(null)
    } finally {
      setLoadingRepos(false)
    }
  }

  async function connect(): Promise<void> {
    setConnecting(true)
    setConnectError('')
    try {
      await window.aicoder.setConnection(host, token.trim(), baseUrl.trim())
      setToken('')
      await refreshConns()
      await loadRepos()
    } catch (e) {
      setConnectError((e as Error).message)
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect(): Promise<void> {
    await window.aicoder.clearConnection(host)
    setRepos(null)
    await refreshConns()
  }

  async function pick(repo: HostRepo): Promise<void> {
    setAddingKey(repo.key)
    try {
      const project = await window.aicoder.addProject(host, repo.key)
      onAdded(project)
    } catch (e) {
      setRepoError((e as Error).message)
    } finally {
      setAddingKey('')
    }
  }

  const shown = (repos ?? []).filter((r) =>
    r.fullName.toLowerCase().includes(filter.trim().toLowerCase())
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Add project</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="segmented" style={{ marginBottom: 18 }}>
            <button className={host === 'github' ? 'on' : ''} onClick={() => setHost('github')}>
              GitHub
            </button>
            <button className={host === 'gitlab' ? 'on' : ''} onClick={() => setHost('gitlab')}>
              GitLab
            </button>
          </div>

          {!conn?.connected ? (
            <div className="connect-form">
              <p className="gdesc">
                Connect with a personal access token that has repo, issue, and pull/merge-request
                read access.
              </p>
              <div className="field provider-field">
                <label>Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={host === 'github' ? 'https://api.github.com' : 'https://gitlab.com'}
                />
              </div>
              <div className="field provider-field">
                <label>Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={host === 'github' ? 'ghp_…' : 'glpat_…'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && token.trim() && !connecting) void connect()
                  }}
                />
              </div>
              {connectError && <div className="form-error">{connectError}</div>}
              <button
                className="btn primary"
                disabled={!token.trim() || connecting}
                onClick={() => void connect()}
              >
                {connecting ? 'Verifying…' : 'Connect'}
              </button>
            </div>
          ) : (
            <>
              <div className="conn-status">
                <span>
                  Connected as <b>@{conn.login}</b> · {conn.baseUrl}
                </span>
                <button className="btn ghost" onClick={() => void disconnect()}>
                  Disconnect
                </button>
              </div>

              <input
                className="repo-search"
                type="text"
                value={filter}
                placeholder="Filter repositories…"
                onChange={(e) => setFilter(e.target.value)}
              />

              {loadingRepos && <div className="hint-line">Loading repositories…</div>}
              {repoError && <div className="form-error">{repoError}</div>}

              {!loadingRepos && !repoError && (
                <div className="repo-list">
                  {shown.map((r) => (
                    <button
                      key={r.key}
                      className="repo-item"
                      disabled={!!addingKey}
                      onClick={() => void pick(r)}
                    >
                      <span className="repo-item-main">
                        <span className="repo-item-name">{r.fullName}</span>
                        {r.description && <span className="repo-item-desc">{r.description}</span>}
                      </span>
                      <span className="repo-item-add">
                        {addingKey === r.key ? 'Adding…' : 'Add'}
                      </span>
                    </button>
                  ))}
                  {shown.length === 0 && <div className="hint-line">No repositories match.</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
