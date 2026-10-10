import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { buildMapHtml, markersFromChildren, zoomFromDelta } from './protomapsHtml';

export default function AppMap({ style, region, children }) {
  const markers = markersFromChildren(children);
  const markersKey = JSON.stringify(markers);
  const html = useMemo(
    () => buildMapHtml({
      center: { latitude: region?.latitude ?? 1.3521, longitude: region?.longitude ?? 103.8198 },
      zoom: zoomFromDelta(region?.latitudeDelta),
      markers,
    }),
    [region?.latitude, region?.longitude, region?.latitudeDelta, markersKey]
  );

  // A blob URL rather than srcDoc: a srcDoc frame reports its origin as "null", which stops
  // MapLibre's worker from handing pmtiles:// tile requests back to the page, so no tiles load.
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <View style={style}>
      <iframe
        title="Map"
        src={src || undefined}
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}

// Markers are read by AppMap from its children; they render nothing themselves.
export function Marker() {
  return null;
}
