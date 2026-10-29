const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,

  // Persistência no Sistema de Arquivos Local
  saveState: (data) => ipcRenderer.invoke('desktop:saveState', data),
  loadState: () => ipcRenderer.invoke('desktop:loadState'),

  // Diálogos Nativos do Windows/Mac/Linux
  openFileDialog: (filters) => ipcRenderer.invoke('desktop:openFileDialog', filters),
  saveFileDialog: (opts) => ipcRenderer.invoke('desktop:saveFileDialog', opts),

  // Controles de Janela
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
});
