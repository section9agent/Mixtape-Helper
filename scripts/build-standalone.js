#!/usr/bin/env node
/**
 * Builds mixtape-helper-standalone.html — a single self-contained file that
 * runs in any browser — by inlining app/jcard-templates.js into app/index.html.
 *
 *   node scripts/build-standalone.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
const templates = fs.readFileSync(path.join(root, 'app', 'jcard-templates.js'), 'utf8');

const tag = '<script src="jcard-templates.js"></script>';
if (!html.includes(tag)) {
  console.error('Could not find the jcard-templates.js <script> tag in app/index.html');
  process.exit(1);
}
const out = html.replace(tag, () => '<script>\n' + templates + '</script>');
fs.writeFileSync(path.join(root, 'mixtape-helper-standalone.html'), out);
console.log(`Wrote mixtape-helper-standalone.html (${(out.length / 1e6).toFixed(1)} MB)`);
