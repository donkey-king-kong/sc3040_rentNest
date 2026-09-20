import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

export default function AppMap({ region, style }) {
  const latitude = region?.latitude ?? 1.3521;
  const longitude = region?.longitude ?? 103.8198;
  return <View style={[style, { backgroundColor: '#edf1ee', justifyContent: 'center', alignItems: 'center' }]}>
    <Text>Explore this area on a map</Text>
    <TouchableOpacity onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`)}>
      <Text style={{ color: '#205c43', padding: 12 }}>Open map</Text>
    </TouchableOpacity>
  </View>;
}
export function Marker() { return null; }
