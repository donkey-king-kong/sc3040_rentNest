import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppMap({ style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Map preview is available on mobile only for now.</Text>
    </View>
  );
}

export function Marker() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
  },
  text: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
