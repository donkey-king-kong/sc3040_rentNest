import React, { useMemo } from 'react';
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

  return (
    <View style={style}>
      <iframe
        title="Map"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}

// Markers are read by AppMap from its children; they render nothing themselves.
export function Marker() {
  return null;
}
