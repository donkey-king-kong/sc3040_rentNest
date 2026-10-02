import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, TouchableOpacity, View} from 'react-native';

const COLOR_PRESETS = {
    blue: {
        base: '#3D7DD8',
        core: '#0D4D9A',
        rim: '#6FB3FF',
        glow: 'rgba(20,102,216,0.35)',
        iris: '#E0EEFF',
        irisShade: '#D4ECFF',
    },
    orange: {
        base: '#E27A2A',
        core: '#A63E10',
        rim: '#FFB46A',
        glow: 'rgba(232,100,0,0.35)',
        iris: '#FFE8CC',
        irisShade: '#FFD9B8',
    },
    red: {
        base: '#E74668',
        core: '#A60033',
        rim: '#FF8AAA',
        glow: 'rgba(223,24,92,0.35)',
        iris: '#FFD6E8',
        irisShade: '#FFCDE4',
    },
    green: {
        base: '#2A9D5F',
        core: '#0D6632',
        rim: '#6DD187',
        glow: 'rgba(12,168,82,0.35)',
        iris: '#D1FADD',
        irisShade: '#C5F5D8',
    },
    purple: {
        base: '#8B3FD1',
        core: '#4A0080',
        rim: '#C896FF',
        glow: 'rgba(110,46,224,0.35)',
        iris: '#E8D4FF',
        irisShade: '#E0C9FF',
    },
    yellow: {
        base: '#D4A000',
        core: '#8A5500',
        rim: '#FFC93A',
        glow: 'rgba(214,142,0,0.35)',
        iris: '#FFF5CC',
        irisShade: '#FFF0A8',
    },
    cyan: {
        base: '#0A8FB5',
        core: '#003D66',
        rim: '#5DD4FF',
        glow: 'rgba(10,143,181,0.35)',
        iris: '#CDF5FF',
        irisShade: '#D0F0FF',
    },
    pink: {
        base: '#D63384',
        core: '#7A0055',
        rim: '#FF6BB3',
        glow: 'rgba(214,51,132,0.35)',
        iris: '#FFE5F5',
        irisShade: '#FFD6ED',
    },
    indigo: {
        base: '#4F46E5',
        core: '#2D157A',
        rim: '#8B7EFF',
        glow: 'rgba(79,70,229,0.35)',
        iris: '#DDD6FF',
        irisShade: '#E0D9FF',
    },
    lime: {
        base: '#84CC16',
        core: '#4A5910',
        rim: '#BEF264',
        glow: 'rgba(132,204,22,0.35)',
        iris: '#ECFCCF',
        irisShade: '#F7FEE8',
    },
    turquoise: {
        base: '#0D9488',
        core: '#1A5555',
        rim: '#2DD4BF',
        glow: 'rgba(13,148,136,0.35)',
        iris: '#CCFBF1',
        irisShade: '#C0FDF5',
    },
    violet: {
        base: '#A855F7',
        core: '#4A2A7A',
        rim: '#D8B4FE',
        glow: 'rgba(168,85,247,0.35)',
        iris: '#F3E8FF',
        irisShade: '#EDE9FE',
    },
};

const SIZE_PRESETS = {
    sm: {
        orb: 32,
        eyeWidth: 4,
        eyeHeight: 6,
        eyeGap: 6,
        eyeOffset: -2,
    },
    md: {
        orb: 48,
        eyeWidth: 6,
        eyeHeight: 10,
        eyeGap: 10,
        eyeOffset: -2,
    },
    lg: {
        orb: 64,
        eyeWidth: 8,
        eyeHeight: 12,
        eyeGap: 14,
        eyeOffset: -4,
    },
};

const getShapeRadius = (shape, orbSize) => {
    if (shape === 'square') {
        return 0;
    }
    if (shape === 'squircle') {
        return orbSize * 0.4;
    }
    return orbSize / 2;
};

const Eye = ({blinkScale, preset, size}) => (
    <Animated.View
        style={[
            styles.eye,
            {
                width: size.eyeWidth,
                height: size.eyeHeight,
                borderRadius: size.eyeWidth,
                backgroundColor: preset.iris,
                borderColor: preset.irisShade,
                transform: [{scaleY: blinkScale}],
            },
        ]}
    />
);

const AvatarOrb = ({
    blinking = true,
    color = 'blue',
    size = 'md',
    shape = 'circle',
    onPress,
    style,
}) => {
    const preset = COLOR_PRESETS[color] || COLOR_PRESETS.blue;
    const dims = SIZE_PRESETS[size] || SIZE_PRESETS.md;
    const blinkScale = useRef(new Animated.Value(1)).current;
    const delayedBlinkScale = useRef(new Animated.Value(1)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!blinking) {
            blinkScale.setValue(1);
            delayedBlinkScale.setValue(1);
            return undefined;
        }

        const createBlink = (value, delay = 0) => Animated.loop(
            Animated.sequence([
                Animated.delay(3168 + delay),
                Animated.timing(value, {
                    toValue: 0.07,
                    duration: 120,
                    useNativeDriver: true,
                }),
                Animated.delay(144),
                Animated.timing(value, {
                    toValue: 1,
                    duration: 108,
                    useNativeDriver: true,
                }),
                Animated.delay(Math.max(0, 60 - delay)),
            ])
        );

        const leftBlink = createBlink(blinkScale, 0);
        const rightBlink = createBlink(delayedBlinkScale, 60);
        leftBlink.start();
        rightBlink.start();

        return () => {
            leftBlink.stop();
            rightBlink.stop();
        };
    }, [blinkScale, blinking, delayedBlinkScale]);

    const animatePress = (toValue) => {
        Animated.spring(pressScale, {
            toValue,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
        }).start();
    };

    return (
        <TouchableOpacity
            accessibilityRole="imagebutton"
            accessibilityLabel="AI Avatar"
            activeOpacity={0.9}
            onPress={onPress}
            onPressIn={() => animatePress(1.12)}
            onPressOut={() => animatePress(1)}
        >
            <Animated.View
                style={[
                    styles.orb,
                    {
                        width: dims.orb,
                        height: dims.orb,
                        borderRadius: getShapeRadius(shape, dims.orb),
                        backgroundColor: preset.base,
                        shadowColor: preset.glow,
                        transform: [
                            {scaleX: pressScale},
                            {
                                scaleY: pressScale.interpolate({
                                    inputRange: [1, 1.12],
                                    outputRange: [1, 1.2],
                                }),
                            },
                        ],
                    },
                    style,
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[
                        styles.coreGlow,
                        {
                            backgroundColor: preset.core,
                            borderRadius: dims.orb / 2,
                        },
                    ]}
                />
                <View
                    pointerEvents="none"
                    style={[
                        styles.rimGlow,
                        {
                            backgroundColor: preset.rim,
                            borderRadius: dims.orb / 2,
                        },
                    ]}
                />
                <View pointerEvents="none" style={styles.shine} />
                <View pointerEvents="none" style={styles.shadowWash} />
                <View
                    style={[
                        styles.eyes,
                        {
                            gap: dims.eyeGap,
                            transform: [{translateY: dims.eyeOffset}],
                        },
                    ]}
                >
                    <Eye blinkScale={blinkScale} preset={preset} size={dims} />
                    <Eye blinkScale={delayedBlinkScale} preset={preset} size={dims} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    orb: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    coreGlow: {
        position: 'absolute',
        width: '62%',
        height: '62%',
        top: '10%',
        opacity: 0.72,
    },
    rimGlow: {
        position: 'absolute',
        width: '120%',
        height: '120%',
        bottom: '-54%',
        opacity: 0.46,
    },
    shine: {
        position: 'absolute',
        width: '72%',
        height: '44%',
        top: '8%',
        left: '9%',
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.28)',
        opacity: 0.7,
        transform: [{rotate: '-18deg'}],
    },
    shadowWash: {
        position: 'absolute',
        width: '88%',
        height: '88%',
        right: '-30%',
        bottom: '-32%',
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    eyes: {
        zIndex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eye: {
        borderWidth: 1,
    },
});

export default AvatarOrb;
