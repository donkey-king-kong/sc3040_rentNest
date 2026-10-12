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
        <Text style={styles.name}>{name || 'Property enquiry'}</Text>
        {onRemove && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove property attachment" onPress={onRemove} style={styles.action}>
            <FontAwesome name="times" size={18} color="#33463E" />
          </TouchableOpacity>
        )}
      </View>
      {!!address && <View style={styles.addressRow}>
        <FontAwesome name="map-marker" size={16} color="#52665B" style={styles.addressIcon} />
        <Text style={styles.address}>{address}</Text>
      </View>}
      {unavailable ? <Text style={styles.address}>Listing no longer available</Text> : (
        <View style={styles.actions}>
          {onOpen && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View listing"
              onPress={onOpen} activeOpacity={0.75} style={styles.viewListingButton}>
              <Text style={styles.viewListingLabel}>View listing</Text>
            </TouchableOpacity>
          )}
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
  preview: { padding: 16, backgroundColor: '#F6F8F6', borderColor: '#D8E1DA', borderWidth: 1, borderRadius: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#193A2E', flexShrink: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  addressIcon: { marginTop: 2 },
  address: { flexShrink: 1, fontSize: 13, lineHeight: 19, color: '#41574C' },
  actions: { gap: 8, marginTop: 16 },
  viewListingButton: { minHeight: 44, minWidth: 44, width: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#698173', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  viewListingLabel: { color: '#193A2E', fontWeight: '600', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#1F5C44', fontWeight: '600', fontSize: 13 },
});
