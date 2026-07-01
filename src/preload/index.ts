import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/ipc'
import type { AgentRun, AiCoderApi, GitHost, Settings } from '../shared/types'

const api: AiCoderApi = {
  getProjects: () => ipcRenderer.invoke(IPC.getProjects),
  getIssues: (id: string) => ipcRenderer.invoke(IPC.getIssues, id),
  getPullRequests: (id: string) => ipcRenderer.invoke(IPC.getPullRequests, id),
  getCosts: (id: string) => ipcRenderer.invoke(IPC.getCosts, id),
  getActivity: (id: string) => ipcRenderer.invoke(IPC.getActivity, id),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  saveSettings: (s: Settings) => ipcRenderer.invoke(IPC.saveSettings, s),

  listConnections: () => ipcRenderer.invoke(IPC.listConnections),
  setConnection: (host: GitHost, token: string, baseUrl: string) =>
    ipcRenderer.invoke(IPC.setConnection, host, token, baseUrl),
  clearConnection: (host: GitHost) => ipcRenderer.invoke(IPC.clearConnection, host),
  listRepos: (host: GitHost) => ipcRenderer.invoke(IPC.listRepos, host),
  addProject: (host: GitHost, key: string) => ipcRenderer.invoke(IPC.addProject, host, key),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.removeProject, id),

  startRun: (projectId: string, issueId: string, issueTitle: string) =>
    ipcRenderer.invoke(IPC.startRun, projectId, issueId, issueTitle),
  cancelRun: (runId: string) => ipcRenderer.invoke(IPC.cancelRun, runId),
  listRuns: (projectId: string) => ipcRenderer.invoke(IPC.listRuns, projectId),
  onRunUpdate: (cb: (run: AgentRun) => void) => {
    const listener = (_e: IpcRendererEvent, run: AgentRun): void => cb(run)
    ipcRenderer.on(IPC.runUpdate, listener)
    return () => ipcRenderer.removeListener(IPC.runUpdate, listener)
  }
}

contextBridge.exposeInMainWorld('aicoder', api)
contextBridge.exposeInMainWorld('platform', process.platform)
