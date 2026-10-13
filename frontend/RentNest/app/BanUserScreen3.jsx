import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';

import { FontAwesome } from 'react-native-vector-icons';

const BanUserScreen3 = () => {
  const router = useRouter();
  const { replace } = router;
  const returnToAdmin = () => router.replace('/AdminScreen');
  useEffect(() => {
    const timer = setTimeout(() => replace('/AdminScreen'), 2000);
    return () => clearTimeout(timer);
  }, [replace]);

  return (
    <View style={styles.container}>
      <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={returnToAdmin}>
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.iconBox} accessible={false}>
              <FontAwesome name="check" size={34} color="#FFFFFF" accessible={false} />
            </View>
            <Text style={styles.title} accessibilityLiveRegion="polite">User Banned</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  card: { width: '100%', maxWidth: 360, alignItems: 'center', backgroundColor: 'rgba(45, 45, 45, 0.82)',
    borderRadius: 28, paddingVertical: 28, paddingHorizontal: 24, shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.24, shadowRadius: 22, elevation: 8 },
  iconBox: { width: 72, height: 72, borderRadius: 18, backgroundColor: 'rgba(58, 58, 58, 0.72)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
});

export default BanUserScreen3;
