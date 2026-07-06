const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sparta', {
  navigate: (target) => ipcRenderer.invoke('browser:navigate', target),
  back: () => ipcRenderer.invoke('browser:back'),
  forward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  home: () => ipcRenderer.invoke('browser:home'),
  purge: () => ipcRenderer.invoke('browser:purge'),
  toggleTheme: () => ipcRenderer.invoke('browser:theme'),
  toggleTor: () => ipcRenderer.invoke('browser:tor'),
  getTorInfo: () => ipcRenderer.invoke('browser:tor-info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getLanguage: (lang) => ipcRenderer.invoke('i18n:get', lang),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  setPanel: (open) => ipcRenderer.invoke('browser:panel', open),
  openDownload: (id) => ipcRenderer.invoke('downloads:open', id),
  deleteHistory: (id) => ipcRenderer.invoke('history:delete', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  toggleBookmark: (url, title) => ipcRenderer.invoke('bookmarks:toggle', { url, title }),
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  deleteBookmark: (url) => ipcRenderer.invoke('bookmarks:delete', url),
  zoomIn: () => ipcRenderer.invoke('browser:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('browser:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('browser:zoom-reset'),
  fullscreen: () => ipcRenderer.invoke('browser:fullscreen'),
  devTools: () => ipcRenderer.invoke('browser:devtools'),
  newTab: () => ipcRenderer.invoke('tab:new'),
  newPrivateTab: () => ipcRenderer.invoke('tab:new-private'),
  closeTab: (id) => ipcRenderer.invoke('tab:close', id),
  closeCurrentTab: () => ipcRenderer.invoke('tab:close-current'),
  clearStorage: () => ipcRenderer.invoke('settings:clear-data'),
  switchTab: (id) => ipcRenderer.invoke('tab:switch', id),
  nextTab: () => ipcRenderer.invoke('tab:next'),
  previousTab: () => ipcRenderer.invoke('tab:previous'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  onState: (callback) => {
    ipcRenderer.on('browser:state', (_event, state) => callback(state));
  },
  onTorInfo: (callback) => {
    ipcRenderer.on('tor:info', (_event, info) => callback(info));
  }
});
