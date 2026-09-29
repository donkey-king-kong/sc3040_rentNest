import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import MorphingInfinity from '../components/MorphingInfinity';

export default function Layout() {
  const pathname = usePathname();
  const [isRouteLoading, setIsRouteLoading] = useState(true);

  useEffect(() => {
    setIsRouteLoading(true);
    const timeout = setTimeout(() => {
      setIsRouteLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <View style={styles.container}>
      <Stack />
      {isRouteLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <MorphingInfinity size={86} color="#2FA84F" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
});
