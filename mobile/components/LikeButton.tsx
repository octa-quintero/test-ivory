import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFeedStore } from '../stores/feedStore';

interface LikeButtonProps {
  postId: string;
  likedByMe: boolean;
  likesCount: number;
}

const ACTIVE = '#C9B99A';
const INACTIVE = '#6b6f85';
const PARTICLE_COUNT = 8;

// Esplosione di particelle attorno al cuore quando si mette like.
// Un solo Animated.Value condiviso pilota tutte le particelle via interpolate.
function HeartBurst({ trigger }: { trigger: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [trigger, progress]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={burst.container}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * 2 * Math.PI - Math.PI / 2;
        const distance = 24 + (i % 3) * 7;
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * distance],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(angle) * distance],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [1, 0.9, 0],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.25, 1],
          outputRange: [0.3, 1.1, 0.5],
        });

        return (
          <Animated.Text
            key={i}
            style={[
              burst.particle,
              i % 2 === 0 ? burst.heartParticle : burst.sparkParticle,
              { opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          >
            {i % 2 === 0 ? '♥' : '✦'}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const burst = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  heartParticle: {
    fontSize: 10,
    color: ACTIVE,
  },
  sparkParticle: {
    fontSize: 9,
    color: '#e8d9b5',
  },
});

export default function LikeButton({ postId, likedByMe, likesCount }: LikeButtonProps) {
  const pendingLikes = useFeedStore((state) => state.pendingLikes);
  const toggleLike = useFeedStore((state) => state.toggleLike);
  const isPending = pendingLikes.has(postId);

  const [burstTrigger, setBurstTrigger] = useState(0);
  const popScale = useRef(new Animated.Value(1)).current;

  const handlePress = (): void => {
    if (!likedByMe) {
      // Burst + "pop" del cuore solo quando si mette like, non quando si toglie:
      // cresce con overshoot e rimbalza alla dimensione originale
      setBurstTrigger((t) => t + 1);
      popScale.setValue(1);
      Animated.sequence([
        Animated.timing(popScale, {
          toValue: 1.35,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(popScale, {
          toValue: 1,
          friction: 4,
          tension: 320,
          useNativeDriver: true,
        }),
      ]).start();
    }
    void toggleLike(postId, likedByMe);
  };

  return (
    <Pressable style={styles.button} onPress={handlePress} disabled={isPending} hitSlop={8}>
      <View style={styles.heartWrap}>
        <Animated.Text
          style={[
            styles.heart,
            likedByMe && styles.heartLiked,
            { transform: [{ scale: popScale }] },
          ]}
        >
          {likedByMe ? '♥' : '♡'}
        </Animated.Text>
        <HeartBurst trigger={burstTrigger} />
      </View>
      <Text style={[styles.count, likedByMe && styles.countLiked]}>{likesCount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  // Dimensioni fisse: ♥ e ♡ hanno metriche diverse, senza box fisso il layout salta
  heartWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    fontSize: 18,
    color: INACTIVE,
    lineHeight: 22,
    textAlign: 'center',
  },
  heartLiked: {
    color: ACTIVE,
  },
  count: {
    fontSize: 13,
    color: INACTIVE,
    fontWeight: '500',
  },
  countLiked: {
    color: ACTIVE,
  },
});
