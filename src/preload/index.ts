import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { AiCoderApi, GitHost, Settings } from '../shared/types'

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
  removeProject: (id: string) => ipcRenderer.invoke(IPC.removeProject, id)
}

contextBridge.exposeInMainWorld('aicoder', api)
contextBridge.exposeInMainWorld('platform', process.platform)
