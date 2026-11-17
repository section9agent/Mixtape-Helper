# Mixtape Helper — Desktop App

A standalone cassette mixtape planner, j-card designer, and Discogs track-time calculator.

---

## Option A — Just use the HTML file (zero install)

Open `mixtape-helper-standalone.html` in any web browser. No internet required for
the core tools — the 63 built-in J-card templates are bundled inside the file.
(The Discogs tab still needs a connection when it fetches release data.)

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

## J-card templates

The J-Card Designer ships with the scans in `JCards/JPEG`, plus a blank card and a
“Choose your own image…” option. Cards are drawn and printed at their real size —
print at **100% / Actual size** and cut along the grey outline.

Each template's default text-box positions live in `JCards/layouts.json`. After
adding or changing a template, rebuild the bundled data:

```bash
python3 scripts/build-templates.py   # → app/jcard-templates.js (needs Pillow)
node scripts/build-standalone.js     # → mixtape-helper-standalone.html
```

---

## Project structure

```
mixtape-helper/
├── main.js                 ← Electron main process (window, menus, IPC, updater)
├── preload.js              ← Secure bridge: exposes save/open to the renderer
├── package.json            ← npm scripts + electron-builder config
├── app/
│   ├── index.html          ← The app UI and logic
│   └── jcard-templates.js  ← Built-in J-card templates (generated)
├── JCards/                 ← Template scans (JPEG, PDF) and layouts.json
├── scripts/                ← Template + standalone build scripts
└── mixtape-helper-standalone.html  ← Single-file browser version (generated)
```
