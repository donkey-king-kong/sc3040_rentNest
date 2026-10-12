import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function EnquiryPreview({ name, address, unavailable = false, onOpen, onRemove, onOffer }) {
  return (
    <View style={styles.preview}>
      <View style={styles.heading}>
        <FontAwesome name="home" size={20} color="#265D4B" />
        <Text style={styles.name}>{name || 'Property enquiry'}</Text>
        {onRemove && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove property attachment" onPress={onRemove} style={styles.action}>
            <FontAwesome name="times" size={18} color="#33463E" />
          </TouchableOpacity>
        )}
      </View>
      {!!address && <Text style={styles.address}>{address}</Text>}
      {unavailable ? <Text style={styles.address}>Listing no longer available</Text> : (
        <View style={styles.actions}>
          {onOpen && <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.action}><Text style={styles.link}>View property</Text></TouchableOpacity>}
          {onOffer && <TouchableOpacity accessibilityRole="button" onPress={onOffer} style={styles.action}><Text style={styles.link}>Offer this property</Text></TouchableOpacity>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { padding: 12, backgroundColor: '#EDF5F0', borderRadius: 10, marginVertical: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#193A2E', flexShrink: 1 },
  address: { fontSize: 13, lineHeight: 19, color: '#41574C', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#1F5C44', fontWeight: '600', fontSize: 13 },
});
