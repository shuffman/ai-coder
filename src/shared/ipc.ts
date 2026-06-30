// IPC channel names shared between main and preload. One place to keep them in sync.
export const IPC = {
  getProjects: 'projects:get',
  getIssues: 'issues:get',
  getPullRequests: 'pulls:get',
  getCosts: 'costs:get',
  getActivity: 'activity:get',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  // Host connections (Milestone 2)
  listConnections: 'connections:list',
  setConnection: 'connections:set',
  clearConnection: 'connections:clear',
  listRepos: 'hosts:listRepos',
  addProject: 'projects:add',
  removeProject: 'projects:remove'
} as const
