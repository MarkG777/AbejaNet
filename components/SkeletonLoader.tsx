import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle, StyleSheet, Easing } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  circle?: boolean; // Si es true, width, height y borderRadius se ajustan para un círculo
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  circle = false,
}) => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;
  const colors = useAppColors();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const finalStyle: any = [
    styles.skeleton,
    {
      backgroundColor: colors.border, // Usamos el color de borde del tema como base del esqueleto
      opacity: animatedValue,
      width: circle && typeof width === 'number' ? width : width,
      height: circle && typeof width === 'number' ? width : height,
      borderRadius: circle && typeof width === 'number' ? width / 2 : borderRadius,
    },
    style,
  ];

  return <Animated.View style={finalStyle} />;
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
