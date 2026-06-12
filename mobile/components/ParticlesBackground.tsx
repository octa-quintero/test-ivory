import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ParticleConfig {
  id: number;
  x: number;
  size: number;
  maxOpacity: number;
  duration: number;
  initialDelay: number;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const CONFIGS: ParticleConfig[] = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: randomBetween(0, width),
  size: randomBetween(2, 7),
  maxOpacity: randomBetween(0.08, 0.35),
  duration: randomBetween(5000, 12000),
  initialDelay: randomBetween(0, 8000),
}));

interface FloatingParticleProps {
  config: ParticleConfig;
}

function FloatingParticle({ config }: FloatingParticleProps) {
  const translateY = useRef(new Animated.Value(height + 20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const { duration, initialDelay, maxOpacity } = config;

    const loop = (): void => {
      translateY.setValue(height + 20);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(initialDelay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -20,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: maxOpacity,
              duration: duration * 0.15,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: maxOpacity,
              duration: duration * 0.7,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.15,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => loop());
    };

    loop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.x,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

export default function ParticlesBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CONFIGS.map((config) => (
        <FloatingParticle key={config.id} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: '#C9B99A',
  },
});
