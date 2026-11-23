import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const colors = useAppColors();
  const { setHasSeenOnboarding } = useAuth();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  // El índice vive también en una referencia: el estado se actualiza con retraso y, si el usuario toca "Siguiente"
  // varias veces seguidas, cada toque debe partir de la diapositiva REAL en la que va.
  const indexRef = useRef(0);
  const terminando = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const SLIDES = [
    {
      id: '1',
      title: t('onboarding_1_title', 'Bienvenido a AbejaNet'),
      description: t('onboarding_1_desc', 'Monitorea tus colmenas y toma el control de tu apiario desde cualquier lugar fácilmente.'),
      icon: 'aperture-outline',
    },
    {
      id: '2',
      title: t('onboarding_2_title', 'Alertas en Tiempo Real'),
      description: t('onboarding_2_desc', 'Entérate al instante de cambios drásticos de clima o anomalías en tus colmenas.'),
      icon: 'notifications-outline',
    },
    {
      id: '3',
      title: t('onboarding_3_title', 'Gestión Inteligente'),
      description: t('onboarding_3_desc', 'Toma decisiones basadas en datos empíricos e incrementa la productividad de tus abejas.'),
      icon: 'bar-chart-outline',
    },
  ];

  // Antes el índice solo se actualizaba en onMomentumScrollEnd, que Android NO siempre dispara cuando el
  // desplazamiento lo hace el código (scrollToIndex): el índice se quedaba atrasado y "Siguiente" repetía la
  // misma diapositiva. Ahora se actualiza al instante y se desplaza con scrollToOffset (no exige getItemLayout).
  const irA = (indice: number) => {
    indexRef.current = indice;
    setCurrentIndex(indice);
    flatListRef.current?.scrollToOffset({ offset: indice * width, animated: true });
  };

  const handleNext = () => {
    if (indexRef.current < SLIDES.length - 1) {
      irA(indexRef.current + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (terminando.current) return; // evita doble toque en "Comenzar"/"Omitir"
    terminando.current = true;
    await setHasSeenOnboarding();
    router.replace('/(auth)/login');
  };

  // Al deslizar con el dedo, sincroniza el índice con la diapositiva que quedó visible.
  const updateCurrentIndex = (e: any) => {
    const nuevo = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = nuevo;
    setCurrentIndex(nuevo);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleFinish} accessibilityRole="button" accessibilityLabel={t('skip', 'Omitir')} hitSlop={10}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('skip', 'Omitir')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={updateCurrentIndex}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={item.icon as any} size={100} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { backgroundColor: currentIndex === index ? colors.primary : colors.border },
                currentIndex === index && styles.activeIndicator
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? t('start', 'Comenzar') : t('next', 'Siguiente')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  activeIndicator: {
    width: 24,
  },
  button: {
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
