import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';

const notificationBellIcon = require('../assets/images/notificationBell.png');

const ReviewListingScreen3 = () => {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.replace('/AdminScreen'), 2000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <Modal visible transparent animationType="fade" statusBarTranslucent
        onRequestClose={() => router.replace('/AdminScreen')}>
        <View style={styles.notificationOverlay} pointerEvents="none">
          <View style={styles.notificationCard}>
            <View style={styles.notificationIconBox}>
              <Image source={notificationBellIcon} style={styles.notificationIcon} accessible={false} />
            </View>
            <Text style={styles.notificationText} accessibilityRole="alert">Listing Deleted</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  notificationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  notificationIconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 58, 58, 0.72)',
    marginBottom: 16,
  },
  notificationIcon: { width: 34, height: 40, resizeMode: 'contain' },
  notificationText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
});

export default ReviewListingScreen3;
