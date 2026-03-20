import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing, Dimensions } from 'react-native';

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

const { width } = Dimensions.get('window');

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onAnimationComplete }) => {
  // Animación del tamaño del cuadro amarillo al inicio
  const animationValue = useRef(new Animated.Value(0)).current;

  // El color exacto de Splash en app.json extraído de la imagen
  const splashColor = '#FFCC3C';

  useEffect(() => {
    // 1. Convertir el cuadrado gigante de pantalla a un "círculo flotante" más pequeño
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // Requerido False para poder animar borderRadius
    }).start(() => {
      // 2. Hacer fade-out cuando ya es un circulito para que la app debajo aparezca
      Animated.timing(animationValue, {
        toValue: 2,
        duration: 400,
        delay: 200, // Una brevísima pausa
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        onAnimationComplete();
      });
    });
  }, [animationValue, onAnimationComplete]);

  // Transformaciones e interpolaciones:
  
  // 1. Scale: Empieza 100% del tamaño (idéntico al splash nativo), encoge a 35%.
  const scale = animationValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0.35, 0.35], 
  });

  // 2. BorderRadius: Empieza cuadrado (0), termina en un círculo perfecto (width / 2).
  const borderRadius = animationValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, width / 2, width / 2],
  });

  // 3. Opacity: Solo aplica el fade out en el paso del Estado 1 al Estado 2
  const fadeOpacity = animationValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View style={[
      styles.container, 
      { backgroundColor: splashColor, opacity: fadeOpacity }
    ]}>
      <Animated.Image
        source={require('../assets/images/logo_abejanet_sin_letras.png')}
        style={[
          styles.logo,
          { 
            transform: [{ scale }],
            borderRadius: borderRadius,
          }
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, 
  },
  logo: {
    width: width,
    height: width, // Es un cuadrado ancho (100% pantalla) idéntico al 'contain' del Splash Nativo
    resizeMode: 'contain',
    backgroundColor: '#FFCC3C', 
  },
});
