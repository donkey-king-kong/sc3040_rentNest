import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from './MorphingInfinity';

export const ADMIN_COLORS = {
  background: '#F7F8FA', header: '#FFFFFF', ink: '#101820', muted: '#666A70',
  border: '#EAECF0', green: '#2FA84F', selected: '#16794B', error: '#B42318',
};

export function AdminHeader({ title, onBack, backLabel = 'Back', inset = false }) {
  return (
    <View style={[styles.header, inset && styles.inset]}>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}
          accessibilityRole="button" accessibilityLabel={backLabel}>
          <FontAwesome name="chevron-left" size={18} color={ADMIN_COLORS.ink} />
        </TouchableOpacity>
      ) : null}
      <Text style={[styles.title, !onBack && styles.dashboardTitle]}>{title}</Text>
      {onBack ? <View style={styles.spacer} /> : null}
    </View>
  );
}

export function AdminLoadingState({ message = 'Loading...', backgroundColor = ADMIN_COLORS.background }) {
  return (
    <View style={[styles.loading, { backgroundColor }]}>
      <MorphingInfinity size={86} color={ADMIN_COLORS.green} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 1120,
    alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: ADMIN_COLORS.header },
  inset: { width: 'auto', alignSelf: 'stretch', marginHorizontal: -20, marginTop: -20, marginBottom: 20 },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: ADMIN_COLORS.header,
    borderWidth: 1, borderColor: ADMIN_COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginHorizontal: 8, fontSize: 24, fontWeight: '700', textAlign: 'center', color: ADMIN_COLORS.ink },
  dashboardTitle: { textAlign: 'left', marginHorizontal: 0 },
  spacer: { width: 44, flexShrink: 0 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.background },
  loadingText: { marginTop: 14, fontSize: 16, fontWeight: '600', color: ADMIN_COLORS.ink },
});
