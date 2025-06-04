import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getApiUrl } from '../../utils/ip_config';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [api, setApi] = useState('');

  useEffect(() => {
    const fetchApiUrl = async () => {
      const apiUrl = await getApiUrl();
      setApi(apiUrl);
    };
    fetchApiUrl();
  }, []);

  const handleRegister = () => {
    // TODO: conectar con backend de registro
    alert('Registro presionado');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={{ alignItems: 'center' }}>
        <Image
          source={require('@/assets/images/abejanet.png')}
          style={styles.logo}
        />
      </ThemedView>
      <ThemedText type="title">Registro</ThemedText>
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={styles.button} >
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>Crear cuenta</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 240,
    height: 240,
    borderRadius: 120,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
