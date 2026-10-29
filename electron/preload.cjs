const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
  isDesktop: true,
  platform: process.platform,
  saveState: (data) => ipcRenderer.invoke('desktop:saveState', data),
  restoreStateWithRecovery: (data) => ipcRenderer.invoke('desktop:restoreStateWithRecovery', data),
  listRecoveryBackups: () => ipcRenderer.invoke('desktop:listRecoveryBackups'),
  loadRecoveryBackup: (id) => ipcRenderer.invoke('desktop:loadRecoveryBackup', id),
  loadState: () => ipcRenderer.invoke('desktop:loadState'),
  getAppInfo: () => ipcRenderer.invoke('desktop:getAppInfo'),
  openFileDialog: (filters) => ipcRenderer.invoke('desktop:openFileDialog', filters),
  saveFileDialog: (opts) => ipcRenderer.invoke('desktop:saveFileDialog', opts),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
}));
