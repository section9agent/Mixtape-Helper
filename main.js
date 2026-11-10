/**
 * Mixtape Helper — Electron main process
 *
 * Responsibilities:
 *  - Create the BrowserWindow and load the app HTML
 *  - Handle native file open/save via dialog.showSaveDialog / showOpenDialog
 *  - Pass save/open results back to the renderer via IPC
 *  - About window with credits and donation link
 *  - Auto-update via electron-updater (can be disabled in settings)
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Security: keep Node integration OFF in renderer ─────────────────────────
const PRELOAD  = path.join(__dirname, 'preload.js');
const APP_HTML = path.join(__dirname, 'app', 'index.html');

// ── Settings file (persisted in userData) ────────────────────────────────────
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch { return {}; }
}
function saveSettings(obj) {
  try {
    const current = loadSettings();
    fs.writeFileSync(getSettingsPath(), JSON.stringify({ ...current, ...obj }, null, 2), 'utf8');
  } catch {}
}

// ── Auto-updater (graceful — if electron-updater isn't installed yet, skip) ──
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload    = false;   // ask before downloading
  autoUpdater.autoInstallOnAppQuit = true;
} catch { /* running from source without electron-updater */ }

function setupUpdater(mainWin) {
  if (!autoUpdater) return;
  const settings = loadSettings();
  if (settings.autoUpdate === false) return;  // user turned it off

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWin, {
      type: 'info',
      title: 'Update Available',
      message: `Mixtape Helper ${info.version} is available.`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download & Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-not-available', () => {
    // Silent — only show when user triggered the check manually
    if (mainWin._manualUpdateCheck) {
      mainWin._manualUpdateCheck = false;
      dialog.showMessageBox(mainWin, {
        type: 'info',
        title: 'Up to Date',
        message: 'Mixtape Helper is up to date.',
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWin, {
      type: 'info',
      title: 'Ready to Install',
      message: 'Update downloaded.',
      detail: 'The update will be installed when you quit Mixtape Helper.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    if (mainWin._manualUpdateCheck) {
      mainWin._manualUpdateCheck = false;
      dialog.showMessageBox(mainWin, {
        type: 'warning',
        title: 'Update Check Failed',
        message: 'Could not check for updates.',
        detail: err.message,
        buttons: ['OK'],
      });
    }
  });

  // Silently check for updates on startup (5s delay so the window is ready)
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
}

// ── About window ──────────────────────────────────────────────────────────────
function showAboutWindow() {
  const win = new BrowserWindow({
    width:  520,
    height: 580,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'About Mixtape Helper',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const iconPath = path.join(__dirname, 'build', 'icon.png');
  let iconDataUri = '';
  try {
    const img = fs.readFileSync(iconPath);
    iconDataUri = 'data:image/png;base64,' + img.toString('base64');
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline';">
<title>About Mixtape Helper</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #1a1a1a; color: #e8e4dc;
    display: flex; flex-direction: column; align-items: center;
    padding: 32px 28px 24px; min-height: 100vh;
    -webkit-app-region: no-drag;
  }
  img.icon { width: 80px; height: 80px; border-radius: 16px;
    object-fit: cover; margin-bottom: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.04em;
    color: #fff; margin-bottom: 4px; }
  .version { font-size: 12px; color: #888; margin-bottom: 20px; }
  .credit { font-size: 13px; color: #ccc; margin-bottom: 20px;
    text-align: center; line-height: 1.6; }
  .credit strong { color: #e8d5a3; }
  hr { width: 100%; border: none; border-top: 1px solid #333; margin: 16px 0; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #666; margin-bottom: 10px; align-self: flex-start; }
  .oss { width: 100%; font-size: 11.5px; color: #aaa; line-height: 1.8; }
  .oss a { color: #7eb8e8; text-decoration: none; }
  .oss a:hover { text-decoration: underline; }
  .donate-box {
    width: 100%; background: #252520; border: 1px solid #3a3830;
    border-radius: 10px; padding: 16px; text-align: center; margin-top: 4px;
  }
  .donate-box p { font-size: 13px; color: #bbb; margin-bottom: 12px; line-height: 1.5; }
  .donate-btn {
    display: inline-block; background: #0070ba; color: #fff;
    font-size: 13px; font-weight: 600; padding: 9px 24px;
    border-radius: 20px; text-decoration: none; letter-spacing: 0.02em;
    transition: background 0.15s;
  }
  .donate-btn:hover { background: #005ea6; }
</style>
</head>
<body>
  ${iconDataUri ? `<img class="icon" src="${iconDataUri}" alt="Mixtape Helper icon">` : ''}
  <h1>Mixtape Helper</h1>
  <div class="version">Version ${app.getVersion()}</div>
  <div class="credit">
    Coded by <strong>Claude &amp; Emmanuel Hoachlander</strong><br>
    A cassette mixtape planner, J-card designer, and Discogs value calculator.
  </div>

  <hr>
  <div class="section-title">Open Source Acknowledgements</div>
  <div class="oss">
    <strong>Electron</strong> — Cross-platform desktop framework<br>
    &nbsp;&nbsp;<a href="https://www.electronjs.org">electronjs.org</a> · MIT License<br><br>
    <strong>electron-builder</strong> — App packaging &amp; distribution<br>
    &nbsp;&nbsp;<a href="https://www.electron.build">electron.build</a> · MIT License<br><br>
    <strong>electron-updater</strong> — Auto-update support<br>
    &nbsp;&nbsp;<a href="https://www.electron.build/auto-update">electron.build/auto-update</a> · MIT License<br><br>
    <strong>Google Fonts</strong> — Caveat, Dancing Script, Indie Flower, Patrick Hand,<br>
    &nbsp;&nbsp;Courier Prime, Oswald · Various open font licenses<br>
    &nbsp;&nbsp;<a href="https://fonts.google.com">fonts.google.com</a><br><br>
    <strong>Discogs API</strong> — Cassette marketplace data<br>
    &nbsp;&nbsp;<a href="https://www.discogs.com/developers">discogs.com/developers</a>
  </div>

  <hr>
  <div class="donate-box">
    <p>If you enjoy Mixtape Helper, please consider a small donation —<br>it helps keep the project going!</p>
    <a class="donate-btn" href="https://www.paypal.com/donate/?business=section9agent%40hotmail.com&currency_code=USD">
      ♥ Donate via PayPal
    </a>
  </div>

  <script>
    document.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        // postMessage trick to reach main without contextBridge
        window.location.href = a.href;
      });
    });
  </script>
</body>
</html>`;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  // Open all links externally
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('data:')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

// ── Main window ───────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:  1200,
    height: 820,
    minWidth:  760,
    minHeight: 600,
    title: 'Mixtape Helper',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: PRELOAD,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  win.loadFile(APP_HTML);

  if (process.env.MIXTAPE_DEV) {
    win.webContents.openDevTools();
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
let mainWindow = null;

app.whenReady().then(() => {
  mainWindow = createWindow();
  buildMenu(mainWindow);
  setupUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      buildMenu(mainWindow);
    }
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
  } catch { return null; }
});

// ── IPC: settings ─────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('set-settings', (_e, obj) => { saveSettings(obj); return true; });

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu(mainWin) {
  const isMac = process.platform === 'darwin';
  const settings = loadSettings();
  const autoUpdateEnabled = settings.autoUpdate !== false;

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
      label: 'Help',
      submenu: [
        {
          label: 'About Mixtape Helper…',
          click: () => showAboutWindow(),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          enabled: !!autoUpdater,
          click: () => {
            if (!autoUpdater) return;
            if (mainWin) mainWin._manualUpdateCheck = true;
            autoUpdater.checkForUpdates().catch(() => {});
          },
        },
        {
          label: 'Auto-Update on Launch',
          type: 'checkbox',
          checked: autoUpdateEnabled,
          click: (menuItem) => {
            saveSettings({ autoUpdate: menuItem.checked });
          },
        },
        { type: 'separator' },
        {
          label: 'Tape Art Repros Site',
          click: () => shell.openExternal('https://tapeartrepros.sergiostuff.com/'),
        },
        {
          label: 'Discogs',
          click: () => shell.openExternal('https://www.discogs.com/'),
        },
        { type: 'separator' },
        {
          label: 'Donate via PayPal ♥',
          click: () => shell.openExternal('https://www.paypal.com/donate/?business=section9agent%40hotmail.com&currency_code=USD'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
