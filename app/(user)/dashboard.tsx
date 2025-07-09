import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, View, FlatList, ActivityIndicator, 
  Pressable, Image, Linking
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api'; // Importamos nuestro cliente Axios centralizado
import { Link } from 'expo-router';
import { isAxiosError } from 'axios'; // Importamos el type guard de axios

// Interfaz para un artículo de noticia
interface NewsArticle {
  title: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string; // Añadido para la fecha
  source: {
    name: string;
  };
}

// Función para formatear la fecha de manera legible
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

// Componente para mostrar una tarjeta de noticia individual
const NewsCard: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    // Abre el enlace de la noticia en el navegador del dispositivo
    Linking.openURL(article.url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        styles.newsCard,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.95 : 1,
        }
      ]}
    >
      {imageError || !article.urlToImage || !article.urlToImage.startsWith('http') ? (
        <View style={styles.newsImage} >
            <Ionicons name="image-outline" size={40} color="#B0BEC5" />
            <Text style={styles.placeholderText}>Imagen no disponible</Text>
        </View>
      ) : (
        <Image
          source={{ uri: article.urlToImage }}
          style={styles.newsImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
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


const UserDashboardScreen = () => {
  const { authState } = useAuth();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null); // Limpiamos errores previos
      try {
        // Ya no necesitamos construir la URL ni añadir el token manualmente.
        // Nuestro 'api' se encarga de todo.
        const response = await api.get('/api/noticias');
        setNews(response.data.articles || []);
      } catch (error) {
        // El interceptor ya se encarga del logout si es un error 401/403.
        // Aquí solo manejamos el error para la UI de esta pantalla.
        console.error('Error al obtener las noticias:', error);
        if (isAxiosError(error) && error.response) {
          setError(`Error: ${error.response.data.message || 'No se pudieron cargar las noticias.'}`);
        } else {
          setError('No se pudieron cargar las noticias. Revisa tu conexión.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [authState.accessToken]);

  const renderNewsSection = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 20 }} />;
    }

    if (error) {
      return <Text style={styles.errorText}>Error al cargar noticias: {error}</Text>;
    }

    return (
      <FlatList
        data={news}
        renderItem={({ item }) => <NewsCard article={item} />}
        keyExtractor={(item) => item.url}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 5 }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="sunny-outline" size={60} color="#FFC107" />
        <Text style={styles.title}>¡Bienvenido a AbejaNet!</Text>
        <Text style={styles.subtitle}>
          Hola, {authState.user?.nombre || 'apicultor'}. Estamos contentos de verte.
        </Text>
      </View>



      <View style={styles.newsSection}>
        <Text style={styles.sectionTitle}>Noticias del mundo apícola</Text>
        {renderNewsSection()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },

  newsSection: {
    flex: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginBottom: 15,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 20,
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F5F5', // Un fondo gris muy claro
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    marginTop: 8,
    color: '#9E9E9E', // Un color de texto sutil pero legible
    fontSize: 14,
    fontWeight: '500',
  },
  newsTextContainer: {
    padding: 15,
    height: 130, // Fixed height to ensure consistency
    justifyContent: 'space-between',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  newsSource: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  newsDate: {
    fontSize: 12,
    color: '#888',
  },
});

export default UserDashboardScreen;
