/**
 * Mixtape Helper — Electron main process
 *
 * Responsibilities:
 *  - Create the BrowserWindow and load the app HTML
 *  - Handle native file open/save via dialog.showSaveDialog / showOpenDialog
 *  - Pass save/open results back to the renderer via IPC
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Security: keep Node integration OFF in renderer ─────────────────────────
const PRELOAD = path.join(__dirname, 'preload.js');
const APP_HTML = path.join(__dirname, 'app', 'index.html');

function createWindow() {
  const win = new BrowserWindow({
    width:  1200,
    height: 820,
    minWidth:  760,
    minHeight: 600,
    title: 'Mixtape Helper',
    // Show a nice title bar on all platforms
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: PRELOAD,
      nodeIntegration: false,
      contextIsolation: true,
      // Allow loading tape art images from tapeartrepros.sergiostuff.com
      webSecurity: true,
    },
  });

  win.loadFile(APP_HTML);

  // Open DevTools only in development
  if (process.env.MIXTAPE_DEV) {
    win.webContents.openDevTools();
  }

  // Open external links in the system browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: save file ────────────────────────────────────────────────────────────
ipcMain.handle('save-file', async (event, { defaultName, filters, content }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (canceled || !filePath) return { saved: false };
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { saved: true, path: filePath };
  } catch (err) {
    return { saved: false, error: err.message };
  }
});

// ── IPC: open file ────────────────────────────────────────────────────────────
ipcMain.handle('open-file', async (event, { extensions }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Playlist / Track list', extensions: extensions || ['m3u','m3u8','pls','xspf','cue','txt','csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePaths.length) return null;
  const fp = filePaths[0];
  try {
    const content = fs.readFileSync(fp, 'utf8');
    return { name: path.basename(fp), content };
  } catch (err) {
    return null;
  }
});

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    // macOS app menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Playlist…',
          accelerator: 'CmdOrCtrl+O',
          click: (_item, win) => win?.webContents.send('menu-open-file'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Tape Art Repros Site',
          click: () => shell.openExternal('https://tapeartrepros.sergiostuff.com/'),
        },
        {
          label: 'Discogs',
          click: () => shell.openExternal('https://www.discogs.com/'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
