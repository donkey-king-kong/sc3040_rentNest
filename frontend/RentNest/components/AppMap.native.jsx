import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export default function AppMap(props) {
  return <MapView {...props} />;
}

export { Marker };
