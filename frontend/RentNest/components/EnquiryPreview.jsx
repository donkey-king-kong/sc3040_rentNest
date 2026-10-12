import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function EnquiryPreview({ name, address, unavailable = false, onOpen, onRemove, onOffer, variant = 'message' }) {
  if (variant === 'draft') {
    return (
      <View style={styles.draft}>
        <View style={styles.draftContent}>
          <View style={styles.contextRow}>
            <FontAwesome name="home" size={13} color="#37614E" />
            <Text style={styles.context}>Enquiring about</Text>
          </View>
          <Text style={styles.draftName}>{name || 'Property enquiry'}</Text>
          {!!address && <Text style={styles.draftAddress}>{address}</Text>}
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove property attachment"
          onPress={onRemove} style={styles.remove}>
          <FontAwesome name="times" size={15} color="#52665B" />
        </TouchableOpacity>
      </View>
    );
  }
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
  draft: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 8, paddingLeft: 12, paddingVertical: 10, backgroundColor: '#F3F6F4', borderRadius: 12 },
  draftContent: { flex: 1, minWidth: 0 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  context: { fontSize: 12, lineHeight: 16, color: '#37614E', fontWeight: '500' },
  draftName: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: '#182D24' },
  draftAddress: { fontSize: 12, lineHeight: 17, color: '#52665B', marginTop: 2 },
  remove: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  preview: { padding: 12, backgroundColor: '#EDF5F0', borderRadius: 10, marginVertical: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#193A2E', flexShrink: 1 },
  address: { fontSize: 13, lineHeight: 19, color: '#41574C', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#1F5C44', fontWeight: '600', fontSize: 13 },
});
