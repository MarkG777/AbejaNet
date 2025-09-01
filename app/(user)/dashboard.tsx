import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, ActivityIndicator, ScrollView, FlatList, Pressable, Image, Linking, Dimensions, AppState
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { isAxiosError } from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../context/NotificationsContext';
import Constants from 'expo-constants';

// --- INTERFACES ---
interface SummaryData {
  apiariosCount: number;
  colmenasCount: number;
  alertasCount: number;
}

interface NewsArticle {
  title: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string; };
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
}

// --- COMPONENTES ---
const StatCard: React.FC<StatCardProps & { onPress?: () => void }> = ({ icon, label, value, color, onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ width: '48%' }, pressed && styles.pressed]}>
      <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
      </View>
  </Pressable>
);

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

const NewsCard: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const [imageError, setImageError] = useState(false);
  const handlePress = () => Linking.openURL(article.url).catch(err => console.error("Couldn't load page", err));

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.newsCard, { opacity: pressed ? 0.9 : 1 }]}>
      {imageError || !article.urlToImage || !article.urlToImage.startsWith('http') ? (
        <View style={styles.newsImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#B0BEC5" />
        </View>
      ) : (
        <Image source={{ uri: article.urlToImage }} style={styles.newsImage} resizeMode="cover" onError={() => setImageError(true)} />
      )}
      <View style={styles.newsTextContainer}>
        <Text style={styles.newsTitle} numberOfLines={3}>{article.title}</Text>
        <View style={styles.newsFooter}>
          <Text style={styles.newsSource}>{article.source.name}</Text>
          <Text style={styles.newsDate}>{formatDate(article.publishedAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const CARD_WIDTH = Dimensions.get('window').width - 40;

const UserDashboardScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { authState } = useAuth();
  
  // Estados para el resumen
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  // Estados para las noticias
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);

  const { unread, setUnread } = useNotifications();
  const [hideBadge, setHideBadge] = useState(false);

  // Refs y estado para el carrusel
  const flatListRef = useRef<FlatList<NewsArticle>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Función para cargar todos los datos del dashboard
  const fetchData = useCallback(() => {
    console.log('Actualizando datos del dashboard...');
    
    // Cargar resumen
    setLoadingSummary(true);
    api.get('/api/dashboard-summary')
      .then(response => {
        const count = response.data.summary.alertasCount;
        setSummary(response.data.summary);
        setUnread(count);
        // Sincronizar badge del icono de la app con las alertas no leídas
        Notifications.setBadgeCountAsync(count).catch(() => {});
      })
      .catch(err => {
        console.error('Error al obtener el resumen del dashboard:', err);
        setErrorSummary(isAxiosError(err) && err.response ? `Error: ${err.response.data.message || 'No se pudo cargar.'}` : 'No se pudo cargar.');
      })
      .finally(() => setLoadingSummary(false));

    // Cargar noticias directamente desde NewsAPI para evitar el bloqueo de Cloudflare
    setLoadingNews(true);
    const apiKey = Constants.expoConfig?.extra?.NEWS_API_KEY;

    if (!apiKey) {
      console.error('NEWS_API_KEY no está configurada en app.json');
      setErrorNews('Falta la configuración para cargar noticias.');
      setLoadingNews(false);
    } else {
      const query = '(apicultura OR abejas OR colmenas OR "producción de miel" OR apicultor OR polinización) NOT (Acteal OR política OR fábula OR izquierda OR corrupción)';
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&searchIn=title&language=es&sortBy=publishedAt&apiKey=${apiKey}`;

      // Usamos el 'api' (instancia de Axios) para hacer la petición directa
      api.get(url)
        .then(response => {
          const filteredArticles = response.data.articles.filter((article: NewsArticle) => article.title && article.title !== "[Removed]");
          setNews(filteredArticles || []);
        })
        .catch(err => {
          console.error('Error al obtener las noticias directamente desde NewsAPI:', err);
          setErrorNews('No se pudieron cargar las noticias.');
        })
        .finally(() => setLoadingNews(false));
    }
  }, []); // useCallback con dependencias vacías para que la función no se recree

  // Usar useFocusEffect para recargar los datos cada vez que la pantalla se enfoca.
  // Esto es crucial para actualizar el contador de notificaciones después de ver las alertas.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]) // fetchData está memoizado, por lo que no causa re-renders innecesarios.
  );

  // 2. Actualizar al volver a primer plano (AppState)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        fetchData();
      }
    });
    return () => sub.remove();
  }, [fetchData]);

  // 3. Cargar datos y mostrar badge cuando se recibe una notificación mientras la app está abierta
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida, actualizando dashboard...');
      setUnread(unread + 1);
      fetchData();
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, [fetchData]);

  // 4. Efecto para actualizar la cabecera con el icono de notificación
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable 
          style={{ marginRight: 15, padding: 5 }} 
          onPress={() => {
            setHideBadge(true);
            setUnread(0);
            router.push({ pathname: '/(user)/AlertsScreen' });
            // Cuando regrese, refrescar el resumen para actualizar el contador
            setTimeout(() => fetchData(), 500);
          }}
        >
          <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
          {!hideBadge && unread > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </Pressable>
      ),
    });
  }, [navigation, summary, hideBadge, unread]);

  // Efecto para el auto-scroll del carrusel de noticias
  useEffect(() => {
    if (news.length > 0) {
      const interval = setInterval(() => {
        const nextIndex = (activeIndex + 1) % news.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setActiveIndex(nextIndex);
      }, 3000); // Cambiado a 3 segundos para mejor legibilidad

      return () => clearInterval(interval);
    }
  }, [activeIndex, news]);

  const renderSummarySection = () => {
    if (loadingSummary) return <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 20 }} />;
    if (errorSummary) return <Text style={styles.errorText}>{errorSummary}</Text>;
    if (!summary) return null;

    return (
      <View style={styles.statsContainer}>
        <StatCard 
          icon="business-outline" 
          label="Apiarios" 
          value={summary.apiariosCount} 
          color="#3B82F6" 
          onPress={() => router.push('/(user)/ColmenasScreen')}
        />
        <StatCard 
          icon="bug-outline" 
          label="Colmenas" 
          value={summary.colmenasCount} 
          color="#10B981" 
          onPress={() => router.push('/(user)/ColmenasScreen')}
        />
      </View>
    );
  };

    const getItemLayout = useCallback((data: any, index: number) => ({
    length: CARD_WIDTH,
    offset: CARD_WIDTH * index,
    index,
  }), []);

  const renderNewsSection = () => {
    if (loadingNews) return <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 20 }} />;
    if (errorNews) return <Text style={styles.errorText}>{errorNews}</Text>;
    
    return (
      <FlatList
        ref={flatListRef}
        data={news}
        renderItem={({ item }) => <NewsCard article={item} />}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onScroll={(event) => {
          // Actualizar el índice activo si el usuario desliza manualmente
          const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
          setActiveIndex(index);
        }}
        scrollEventThrottle={16}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* El header ahora se controla desde el layout a través de setOptions */}
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Ionicons name="sunny-outline" size={50} color="#FFC107" />
          <Text style={styles.title}>¡Bienvenido a AbejaNet!</Text>
          <Text style={styles.subtitle}>Hola, {authState.user?.nombre || 'apicultor'}. Un gusto tenerte de vuelta.</Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          {renderSummarySection()}
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Noticias del Sector</Text>
          {renderNewsSection()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F7' },
  scrollViewContent: { paddingBottom: 20 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 30, paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginTop: 15 },
  subtitle: { fontSize: 16, color: '#4B5563', marginTop: 5, textAlign: 'center' },
  contentSection: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15,
    alignItems: 'center', justifyContent: 'center',
    // width: '32%', // Ajustado para que quepan 3 tarjetas
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  errorText: { textAlign: 'center', color: '#EF4444', marginTop: 20, fontSize: 16 },
  // News Styles
  newsCard: {
    backgroundColor: 'white', borderRadius: 16,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
    overflow: 'hidden',
    width: CARD_WIDTH, // Ancho completo menos el padding
    height: 300, // Altura fija para el carrusel
  },
  newsImage: { width: '100%', height: 180 },
  newsImagePlaceholder: {
    width: '100%', height: 180, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  newsTextContainer: {
    padding: 15, height: 130,
    justifyContent: 'space-between',
  },
  newsTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  newsSource: { fontSize: 12, color: '#888', fontWeight: '500' },
  newsDate: { fontSize: 12, color: '#888' },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444', // Rojo de alerta
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Color del header para un borde sutil
  },
  notificationText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default UserDashboardScreen;
