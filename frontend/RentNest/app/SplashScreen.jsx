import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

const appIcon = require('../assets/images/icon.png');

export default function SplashScreen({ onFinish }) {
  const badgeScale = useRef(new Animated.Value(0.7)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      onFinish?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [badgeOpacity, badgeScale, onFinish, textOpacity, textTranslateY]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: badgeOpacity,
            transform: [{ scale: badgeScale }],
          },
        ]}
      >
        <Image source={appIcon} style={styles.icon} resizeMode="contain" />
      </Animated.View>
      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.wordmark}>RentNest</Text>
        <Text style={styles.tagline}>Find your next home</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12132A',
  },
  glow: {
    position: 'absolute',
    top: '35%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(232,130,26,0.15)',
    transform: [{ translateY: -100 }],
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8821A',
    shadowColor: '#E8821A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  icon: {
    width: 56,
    height: 56,
    tintColor: '#FFFFFF',
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 22,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },
});
