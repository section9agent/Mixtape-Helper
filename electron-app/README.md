# Mixtape Helper — Desktop App

A standalone cassette mixtape planner, j-card designer, and Discogs track-time calculator.

---

## Option A — Just use the HTML file (zero install)

Open `mixtape-helper-standalone.html` in any web browser. No internet required for
the core tools. (The Discogs tab and tape art catalog still need a connection when
you actually fetch data from those external sites.)

---

## Option B — Desktop app with native file dialogs (Electron)

### Requirements

- [Node.js](https://nodejs.org/) v18 or later (includes npm)

### Quick start

```bash
# Install dependencies (only needed once)
npm install

# Run the app
npm start
```

### Build an installer

```bash
# Windows (.exe installer)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (AppImage)
npm run build:linux
```

Built installers appear in the `dist/` folder.

### What the desktop app adds over the HTML file

| Feature | HTML file | Desktop app |
|---|---|---|
| Native Save dialog | ✗ (browser download) | ✓ |
| Native Open dialog | ✗ (browser file picker) | ✓ |
| File → Open Playlist… menu | ✗ | ✓ |
| Works fully offline | ✓ | ✓ |
| No install needed | ✓ | ✗ |

### Adding an app icon

Put your icon files in a `build/` folder:

- `build/icon.ico` — Windows (256×256 recommended)
- `build/icon.icns` — macOS
- `build/icon.png` — Linux (512×512 recommended)

If the `build/` folder doesn't exist, electron-builder will use a default icon.

---

## Project structure

```
electron-app/
├── main.js          ← Electron main process (window + IPC handlers)
├── preload.js       ← Secure bridge: exposes save/open to the renderer
├── package.json     ← npm scripts + electron-builder config
├── README.md        ← This file
└── app/
    └── index.html   ← The entire app (self-contained, works in a browser too)
```
