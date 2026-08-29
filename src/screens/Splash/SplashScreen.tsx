import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../../components/CustomText';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

export const SplashScreen = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const letterSpacing = useSharedValue(2);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
    scale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.exp) });
    letterSpacing.value = withDelay(
      400,
      withTiming(6, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    letterSpacing: letterSpacing.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <View style={styles.accentCircle} />
        <Animated.Text style={[styles.logoText, animatedTextStyle]}>
          WARISATHI
        </Animated.Text>
        <Text style={styles.tagline}>YOUR PILGRIMAGE COMPANION</Text>
      </Animated.View>
      
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary + '10', // very light orange
    top: '50%',
    left: '50%',
    transform: [{ translateX: -70 }, { translateY: -90 }],
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 60,
  }
});
