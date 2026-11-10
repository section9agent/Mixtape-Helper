/**
 * Preload script — bridges the renderer (HTML page) with
 * Electron's native capabilities, exposed via contextBridge
 * so the renderer never needs Node access directly.
 */
const { contextBridge, ipcRenderer } = require('electron');

// Forward menu-triggered open-file event to the renderer as a DOM custom event
ipcRenderer.on('menu-open-file', () => {
  document.dispatchEvent(new CustomEvent('electron-open-file'));
});

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Save a file via the native Save dialog.
   * @param {string} defaultName  Suggested file name
   * @param {Array}  filters      e.g. [{ name:'M3U Playlist', extensions:['m3u'] }]
   * @param {string} content      Text content to write
   * @returns {Promise<{saved:boolean, path?:string}>}
   */
  saveFile: (defaultName, filters, content) =>
    ipcRenderer.invoke('save-file', { defaultName, filters, content }),

  /**
   * Open a file via the native Open dialog.
   * @param {string[]} extensions  Allowed extensions without the dot
   * @returns {Promise<{name:string, content:string}|null>}
   */
  openFile: (extensions) =>
    ipcRenderer.invoke('open-file', { extensions }),

  /**
   * Read persisted settings (returns plain object).
   * @returns {Promise<object>}
   */
  getSettings: () => ipcRenderer.invoke('get-settings'),

  /**
   * Merge keys into persisted settings.
   * @param {object} obj  Keys to set, e.g. { autoUpdate: false }
   * @returns {Promise<boolean>}
   */
  setSettings: (obj) => ipcRenderer.invoke('set-settings', obj),

  /** Current platform: 'win32' | 'darwin' | 'linux' */
  platform: process.platform,
});
