#!/usr/bin/env node
// Downloads everything the listing map needs into public/map/, so the map renders from the
// Expo dev server without internet access (for example, on a poor lab connection).
//
//   node scripts/fetch-map-assets.js            # libraries, fonts, sprites and Singapore tiles
//   node scripts/fetch-map-assets.js --no-tiles # skip the ~12 MB tile extract
//
// The tile extract needs the go-pmtiles CLI (https://github.com/protomaps/go-pmtiles/releases)
// on PATH, or its path in the PMTILES_BIN environment variable.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'public', 'map');
// Keep these versions in sync with the CDN fallback URLs in components/protomapsHtml.js.
const LIBS = {
  'maplibre-gl.js': 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'maplibre-gl.css': 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'pmtiles.js': 'https://unpkg.com/pmtiles@3.2.0/dist/pmtiles.js',
  'basemaps.js': 'https://unpkg.com/@protomaps/basemaps@5.0.0/dist/basemaps.js',
};
const ASSETS = 'https://protomaps.github.io/basemaps-assets';
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
// Basic Latin, Latin-1/Extended and general punctuation cover the English labels the map uses.
const FONT_RANGES = ['0-255', '256-511', '8192-8447'];
const SPRITES = ['light.json', 'light.png', 'light@2x.json', 'light@2x.png'];
// Singapore, with a little margin.
const BBOX = '103.59,1.15,104.10,1.48';
const MAX_ZOOM = '14';

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  console.log(`  ${path.relative(OUT, file)}`);
}

async function main() {
  console.log(`Writing map assets to ${OUT}`);
  for (const [name, url] of Object.entries(LIBS)) await download(url, path.join(OUT, name));
  for (const font of FONTS)
    for (const range of FONT_RANGES)
      await download(`${ASSETS}/fonts/${encodeURIComponent(font)}/${range}.pbf`, path.join(OUT, 'fonts', font, `${range}.pbf`));
  for (const sprite of SPRITES) await download(`${ASSETS}/sprites/v4/${sprite}`, path.join(OUT, 'sprites', sprite));

  if (process.argv.includes('--no-tiles')) return;
  const builds = await (await fetch('https://build-metadata.protomaps.dev/builds.json')).json();
  const source = `https://build.protomaps.com/${builds[builds.length - 1].key}`;
  const bin = process.env.PMTILES_BIN || 'pmtiles';
  console.log(`  singapore.pmtiles (extracting from ${source})`);
  try {
    execFileSync(bin, ['extract', source, path.join(OUT, 'singapore.pmtiles'), `--bbox=${BBOX}`, `--maxzoom=${MAX_ZOOM}`], { stdio: 'inherit' });
  } catch (error) {
    console.error(`\nCould not run "${bin}". Install go-pmtiles from https://github.com/protomaps/go-pmtiles/releases ` +
      'and add it to PATH, or set PMTILES_BIN to its path, then run this script again.');
    process.exit(1);
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
