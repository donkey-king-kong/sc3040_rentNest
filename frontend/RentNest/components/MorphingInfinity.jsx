import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const MorphingInfinity = ({ size = 72, color = '#2FA84F' }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const ringSize = size * 0.46;
  const strokeWidth = Math.max(4, size * 0.08);

  useEffect(() => {
    let isMounted = true;

    const runAnimation = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isMounted) {
          runAnimation();
        }
      });
    };

    runAnimation();
    return () => {
      isMounted = false;
      progress.stopAnimation();
    };
  }, [progress]);

  const leftScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.72, 1],
  });
  const rightScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.72, 1, 0.72],
  });
  const orbitTranslateX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-size * 0.22, 0, size * 0.22, 0, -size * 0.22],
  });
  const orbitTranslateY = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -size * 0.13, 0, size * 0.13, 0],
  });
  const orbitScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.72, 1, 0.72],
  });

  return (
    <View style={[styles.container, { width: size, height: size * 0.58 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            left: size * 0.06,
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ scale: leftScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            right: size * 0.06,
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ scale: rightScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: strokeWidth * 1.45,
            height: strokeWidth * 1.45,
            borderRadius: strokeWidth,
            backgroundColor: color,
            transform: [
              { translateX: orbitTranslateX },
              { translateY: orbitTranslateY },
              { scale: orbitScale },
            ],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    opacity: 0.82,
  },
  orb: {
    position: 'absolute',
  },
});

export default MorphingInfinity;
