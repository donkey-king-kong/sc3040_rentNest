// Builds a self-contained MapLibre page, shared by web (iframe) and native (WebView).
// Libraries and tiles are loaded from the Expo dev server (public/map/, filled by
// scripts/fetch-map-assets.js) when present, so the map still renders without internet.
// Anything missing locally falls back to the CDN and to this remote tile source, in order:
//   1. EXPO_PUBLIC_PROTOMAPS_KEY  -> Protomaps hosted style (api.protomaps.com/styles/v5/light/en.json)
//   2. EXPO_PUBLIC_PMTILES_URL    -> your own PMTiles file (host must send CORS headers)
//   3. fallback                   -> OpenStreetMap raster tiles
import { MAP_ASSETS_URL } from '../config/api';

const PROTOMAPS_KEY = process.env.EXPO_PUBLIC_PROTOMAPS_KEY;
const PMTILES_URL = process.env.EXPO_PUBLIC_PMTILES_URL;

const TILE_SOURCE = PROTOMAPS_KEY
  ? { mode: 'style', url: `https://api.protomaps.com/styles/v5/light/en.json?key=${PROTOMAPS_KEY}` }
  : PMTILES_URL
    ? { mode: 'vector', source: { type: 'vector', url: `pmtiles://${PMTILES_URL}` } }
    : { mode: 'raster', source: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 } };

// Keep these versions in sync with scripts/fetch-map-assets.js.
const CDN = {
  'maplibre-gl.css': 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'maplibre-gl.js': 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'pmtiles.js': 'https://unpkg.com/pmtiles@3.2.0/dist/pmtiles.js',
  'basemaps.js': 'https://unpkg.com/@protomaps/basemaps@5.0.0/dist/basemaps.js',
};

// Approximate zoom level from a react-native-maps style latitudeDelta.
export const zoomFromDelta = (delta = 0.05) =>
  Math.max(1, Math.min(18, Math.round(Math.log2(360 / Math.max(delta, 0.0001)))));

export function buildMapHtml({ center, zoom, markers }) {
  const config = JSON.stringify({ center, zoom, markers, tiles: TILE_SOURCE, local: MAP_ASSETS_URL, cdn: CDN })
    .replace(/</g, '\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  body { background: #eeeeee; font-family: sans-serif; }
  #error { position: absolute; top: 8px; left: 8px; right: 8px; padding: 6px 10px; background: #fff3cd;
           color: #664d03; font-size: 12px; border-radius: 4px; display: none; z-index: 2; }
</style>
</head>
<body>
<div id="map"></div>
<div id="error"></div>
<script>
  var cfg = ${config};
  var attribution = '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>';

  function showError(message) {
    var el = document.getElementById('error');
    el.style.display = 'block';
    el.textContent = message;
  }

  // Each asset is tried from the local dev server first, then from the CDN. The dev server
  // answers a missing file with its index page and status 200, so a local asset only counts
  // when it actually is what was asked for.
  function sources(name) {
    return cfg.local ? [cfg.local + '/' + name, cfg.cdn[name]] : [cfg.cdn[name]];
  }

  // A short timeout keeps an unreachable dev server from delaying the CDN fallback.
  function fetchLocal(name, options) {
    var request = fetch(cfg.local + '/' + name, options).catch(function () { return null; });
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 2500); });
    return Promise.race([request, timeout]);
  }

  function loadCss() {
    var useCdn = function () {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cfg.cdn['maplibre-gl.css'];
      document.head.appendChild(link);
    };
    if (!cfg.local || !window.fetch) return useCdn();
    fetchLocal('maplibre-gl.css').then(function (r) {
      if (!r || !r.ok || (r.headers.get('content-type') || '').indexOf('css') < 0) return useCdn();
      return r.text().then(function (css) {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      });
    }).catch(useCdn);
  }

  // Resolves once window[globalName] exists, trying each URL in turn.
  function loadScript(urls, globalName) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var next = function () {
        script.remove();
        if (urls.length > 1) loadScript(urls.slice(1), globalName).then(resolve, reject);
        else reject(new Error('could not load ' + urls[0]));
      };
      script.src = urls[0];
      script.onload = function () { window[globalName] ? resolve() : next(); };
      script.onerror = next;
      document.head.appendChild(script);
    });
  }

  // Resolves true when the bundled Singapore tiles are reachable, checked by the file's magic bytes.
  function hasLocalTiles() {
    if (!cfg.local || !window.fetch) return Promise.resolve(false);
    return fetchLocal('singapore.pmtiles', { headers: { Range: 'bytes=0-6' } })
      .then(function (r) { return r && r.ok ? r.text() : ''; })
      .then(function (text) { return text.slice(0, 7) === 'PMTiles'; }, function () { return false; });
  }

  function vectorStyle(source, assetsUrl) {
    return {
      version: 8,
      glyphs: assetsUrl + '/fonts/{fontstack}/{range}.pbf',
      sprite: assetsUrl + '/sprites/light',
      sources: { protomaps: Object.assign({ attribution: attribution }, source) },
      layers: basemaps.layers('protomaps', basemaps.namedFlavor('light'), { lang: 'en' })
    };
  }

  function chooseStyle(useLocalTiles) {
    if (useLocalTiles || cfg.tiles.mode === 'vector') {
      maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
    }
    if (useLocalTiles) {
      // Local tiles stop at zoom 14; MapLibre overzooms them for closer views.
      return vectorStyle({ type: 'vector', url: 'pmtiles://' + cfg.local + '/singapore.pmtiles', maxzoom: 14 }, cfg.local);
    }
    if (cfg.tiles.mode === 'style') return cfg.tiles.url;
    if (cfg.tiles.mode === 'vector') return vectorStyle(cfg.tiles.source, 'https://protomaps.github.io/basemaps-assets');
    return {
      version: 8,
      sources: { osm: Object.assign({ attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors' }, cfg.tiles.source) },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    };
  }

  function render(style) {
    var map = new maplibregl.Map({
      container: 'map',
      center: [cfg.center.longitude, cfg.center.latitude],
      zoom: cfg.zoom,
      attributionControl: { compact: true },
      style: style
    });
    map.on('error', function (e) { console.error('map error', e && e.error && e.error.message); });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    var bounds = new maplibregl.LngLatBounds();
    cfg.markers.forEach(function (m) {
      var marker = new maplibregl.Marker({ color: '#d9534f' }).setLngLat([m.longitude, m.latitude]);
      if (m.title) marker.setPopup(new maplibregl.Popup({ offset: 25 }).setText(m.title));
      marker.addTo(map);
      bounds.extend([m.longitude, m.latitude]);
    });
    if (cfg.markers.length > 1) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });
    }
  }

  loadCss();
  loadScript(sources('maplibre-gl.js'), 'maplibregl')
    .then(function () { return Promise.all([loadScript(sources('pmtiles.js'), 'pmtiles'), loadScript(sources('basemaps.js'), 'basemaps')]); })
    .then(hasLocalTiles)
    .then(function (useLocalTiles) { render(chooseStyle(useLocalTiles)); })
    .catch(function (e) { showError('Map failed to load: ' + e.message); });
</script>
</body>
</html>`;
}

// Normalise <Marker coordinate title /> children into plain objects.
export function markersFromChildren(children) {
  const markers = [];
  const visit = (nodes) => {
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((node) => {
      if (Array.isArray(node)) return visit(node);
      const coord = node?.props?.coordinate;
      if (coord && Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude)) {
        markers.push({ latitude: coord.latitude, longitude: coord.longitude, title: node.props.title || '' });
      }
    });
  };
  visit(children ?? []);
  return markers;
}
