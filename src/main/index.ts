import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import type { GitHost, Settings } from '../shared/types'
import * as mock from './mockData'
import * as projects from './projects'
import { getSettings, saveSettings } from './store'
import { clearConnection, getBaseUrl, listConnections, saveConnection } from './connections'
import { adapterFor, makeAdapter } from './hosts'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 880,
    minHeight: 560,
    show: false,
    title: 'AI-Coder',
    backgroundColor: '#0c1322',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Open external links in the OS browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  // Show real projects once any are connected; otherwise the demo fleet.
  ipcMain.handle(IPC.getProjects, () =>
    projects.hasRealProjects() ? projects.listProjects() : mock.projects
  )
  ipcMain.handle(IPC.getIssues, (_e, id: string) =>
    projects.hasRealProjects() ? projects.issuesFor(id) : mock.getIssues(id)
  )
  ipcMain.handle(IPC.getPullRequests, (_e, id: string) =>
    projects.hasRealProjects() ? projects.pullsFor(id) : mock.getPullRequests(id)
  )
  // Costs/activity have no real source until agents run (Milestone 3); real
  // projects fall through to the empty defaults in mockData.
  ipcMain.handle(IPC.getCosts, (_e, id: string) => mock.getCosts(id))
  ipcMain.handle(IPC.getActivity, (_e, id: string) => mock.getActivity(id))

  ipcMain.handle(IPC.getSettings, () => getSettings())
  ipcMain.handle(IPC.saveSettings, (_e, s: Settings) => saveSettings(s))

  // Host connections (Milestone 2)
  ipcMain.handle(IPC.listConnections, () => listConnections())
  ipcMain.handle(IPC.setConnection, async (_e, host: GitHost, token: string, baseUrl: string) => {
    const base = baseUrl || getBaseUrl(host)
    const v = await makeAdapter(host, token, base).verify()
    if (!v.ok) throw new Error(v.error || 'Could not verify the token.')
    saveConnection(host, token, base, v.login ?? '')
    return listConnections().find((c) => c.host === host)!
  })
  ipcMain.handle(IPC.clearConnection, (_e, host: GitHost) => clearConnection(host))
  ipcMain.handle(IPC.listRepos, (_e, host: GitHost) => {
    const adapter = adapterFor(host)
    if (!adapter) throw new Error(`${host} is not connected.`)
    return adapter.listRepos()
  })
  ipcMain.handle(IPC.addProject, (_e, host: GitHost, key: string) => projects.addProject(host, key))
  ipcMain.handle(IPC.removeProject, (_e, id: string) => projects.removeProject(id))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
