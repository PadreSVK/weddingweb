#!/usr/bin/env node
/**
 * optimize-photos.js
 *   Turns raw per-section photos into web-ready, anonymized WebP files and
 *   wires them into the site automatically.
 *
 *   For every sub-folder of photos_raw/ (one per story section) it:
 *     1. Strips ALL metadata (EXIF/GPS/…) — sharp writes none by default.
 *     2. Auto-orients from EXIF BEFORE stripping, so portrait shots stay upright.
 *     3. Resizes to fit within MAX_EDGE and encodes WebP.
 *     4. Renames sequentially: 01.webp, 02.webp, … (by original filename).
 *     5. Writes them to assets/photos/<section>/.
 *     6. Updates the matching chapter in config.json (chapter.folder === section)
 *        with the resulting image list, so the site shows them automatically.
 *
 *   iOS .heic that libheif refuses is decoded via Windows WIC (heic-to-png.ps1).
 *
 * Usage:  node scripts/optimize-photos.js     (or: npm run photos — also syncs)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'photos_raw');
const OUT_ROOT = path.join(ROOT, 'assets', 'photos');
const CONFIG = path.join(ROOT, 'config.json');
const HEIC_PS1 = path.join(__dirname, 'heic-to-png.ps1');

const MAX_EDGE = 1600; // longest side, px — plenty for retina on this layout
const QUALITY = 80;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff']);

// Decode a stubborn HEIC to a temp PNG via Windows WIC, returning its path.
function heicToPng(inPath) {
  const tmp = path.join(os.tmpdir(), `heic_${path.basename(inPath)}_${process.pid}.png`);
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', HEIC_PS1, '-Src', inPath, '-Dst', tmp], { stdio: 'pipe' });
  return tmp;
}

async function processFolder(section) {
  const srcDir = path.join(SRC_ROOT, section);
  const outDir = path.join(OUT_ROOT, section);

  const files = fs.readdirSync(srcDir)
    .filter(f => EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'sk'));

  if (!files.length) {
    console.log(`• ${section}: 0 photos — skipped (folder empty).`);
    return null; // signal: leave config untouched for this section
  }

  // Fresh output: drop old numbered webp so removed photos don't linger.
  fs.mkdirSync(outDir, { recursive: true });
  for (const old of fs.readdirSync(outDir)) {
    if (/^\d+\.webp$/i.test(old)) fs.rmSync(path.join(outDir, old));
  }

  const pad = Math.max(2, String(files.length).length);
  const images = [];
  let n = 0;

  for (const file of files) {
    const inPath = path.join(srcDir, file);
    const ext = path.extname(file).toLowerCase();
    const num = String(n + 1).padStart(pad, '0');
    const outName = `${num}.webp`;
    const outPath = path.join(outDir, outName);
    let tmpPng = null;
    try {
      let source = inPath;
      try {
        await sharp(inPath).metadata(); // cheap probe — throws if libheif refuses
      } catch (probeErr) {
        if (ext === '.heic' || ext === '.heif') {
          tmpPng = heicToPng(inPath); // WIC already applies orientation
          source = tmpPng;
        } else {
          throw probeErr;
        }
      }

      const info = await sharp(source)
        .rotate() // bake EXIF orientation in before metadata is dropped
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath);

      n++;
      const rel = path.relative(ROOT, outPath).replace(/\\/g, '/');
      images.push(rel);
      console.log(`  ✓ ${section}/${outName}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB   ← ${file}`);
    } catch (err) {
      console.warn(`  ✖ ${section}: SKIP ${file} — ${err.message.split('\n')[0]}`);
    } finally {
      if (tmpPng && fs.existsSync(tmpPng)) fs.rmSync(tmpPng);
    }
  }
  return images;
}

async function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(`✖ Source folder not found: ${SRC_ROOT}`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const chapters = (config.story && config.story.chapters) || [];

  // Sections come from chapters that declare a `folder`.
  const sections = chapters.filter(c => c && c.folder).map(c => c.folder);
  if (!sections.length) {
    console.error('✖ No story chapter has a "folder" property in config.json.');
    process.exit(1);
  }

  let changed = false;
  for (const section of sections) {
    const srcDir = path.join(SRC_ROOT, section);
    if (!fs.existsSync(srcDir)) {
      console.log(`• ${section}: no photos_raw/${section}/ folder — skipped.`);
      continue;
    }
    const images = await processFolder(section);
    if (images === null) continue; // empty folder → don't wipe config
    for (const ch of chapters) {
      if (ch.folder === section) { ch.images = images; changed = true; }
    }
  }

  if (changed) {
    fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
    console.log('\n✓ config.json updated with new photo lists.');
    console.log('  Run "node sync-config.js" (or use "npm run photos") to embed into index.html.');
  } else {
    console.log('\n• No section had photos — config.json left unchanged.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
