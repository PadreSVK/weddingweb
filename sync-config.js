#!/usr/bin/env node
/**
 * sync-config.js
 *   Copies the contents of config.json into the <script id="wedding-config-fallback">
 *   block in index.html. This lets the page work even via double-click (file://).
 *
 * Usage:
 *   node sync-config.js
 *
 * Run this whenever you edit config.json if you want the file://
 * fallback to keep working. Not needed when using a local server.
 */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const cfgPath = path.join(root, 'config.json');
const htmlPath = path.join(root, 'index.html');

const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
let html = fs.readFileSync(htmlPath, 'utf8');

const startTag = '<script type="application/json" id="wedding-config-fallback">';
const endTag = '</script>';
const startIdx = html.indexOf(startTag);
if (startIdx === -1) {
  console.error('❌ <script id="wedding-config-fallback"> not found in index.html');
  process.exit(1);
}
const contentStart = startIdx + startTag.length;
const endIdx = html.indexOf(endTag, contentStart);
if (endIdx === -1) {
  console.error('❌ </script> tag for the fallback config not found');
  process.exit(1);
}

const block = '\n' + JSON.stringify(config, null, 2) + '\n  ';
const before = html.slice(0, contentStart);
const after = html.slice(endIdx);
const updated = before + block + after;

if (updated !== html) {
  fs.writeFileSync(htmlPath, updated);
  console.log('✓ index.html — embedded config sync done.');
} else {
  console.log('• No changes (inline config already matches config.json).');
}
