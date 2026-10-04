// Builds a self-contained MapLibre page, shared by web (iframe) and native (WebView).
// Tile source, in order of preference:
//   1. EXPO_PUBLIC_PROTOMAPS_KEY  -> Protomaps hosted style (api.protomaps.com/styles/v5/light/en.json)
//   2. EXPO_PUBLIC_PMTILES_URL    -> your own PMTiles file (host must send CORS headers)
//   3. fallback                   -> OpenStreetMap raster tiles, so the map always renders in development
const PROTOMAPS_KEY = process.env.EXPO_PUBLIC_PROTOMAPS_KEY;
const PMTILES_URL = process.env.EXPO_PUBLIC_PMTILES_URL;

const TILE_SOURCE = PROTOMAPS_KEY
  ? { mode: 'style', url: `https://api.protomaps.com/styles/v5/light/en.json?key=${PROTOMAPS_KEY}` }
  : PMTILES_URL
    ? { mode: 'vector', source: { type: 'vector', url: `pmtiles://${PMTILES_URL}` } }
    : { mode: 'raster', source: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 } };

// Approximate zoom level from a react-native-maps style latitudeDelta.
export const zoomFromDelta = (delta = 0.05) =>
  Math.max(1, Math.min(18, Math.round(Math.log2(360 / Math.max(delta, 0.0001)))));

export function buildMapHtml({ center, zoom, markers }) {
  const config = JSON.stringify({ center, zoom, markers, tiles: TILE_SOURCE })
    .replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/pmtiles@3.2.0/dist/pmtiles.js"></script>
<script src="https://unpkg.com/@protomaps/basemaps@5.0.0/dist/basemaps.js"></script>
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
  try {
    var attribution = '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>';
    var style;
    if (cfg.tiles.mode === 'style') {
      style = cfg.tiles.url;
    } else if (cfg.tiles.mode === 'vector') {
      var protocol = new pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      style = {
        version: 8,
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
        sources: { protomaps: Object.assign({ attribution: attribution }, cfg.tiles.source) },
        layers: basemaps.layers('protomaps', basemaps.namedFlavor('light'), { lang: 'en' })
      };
    } else {
      style = {
        version: 8,
        sources: { osm: Object.assign({ attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors' }, cfg.tiles.source) },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      };
    }

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
  } catch (e) {
    var el = document.getElementById('error');
    el.style.display = 'block';
    el.textContent = 'Map failed to load: ' + e.message;
  }
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
