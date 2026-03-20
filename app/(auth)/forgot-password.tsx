import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAppColors } from '@/hooks/useAppColors';

export default function ForgotPasswordScreen() {
  const colors = useAppColors();
  const [email, setEmail] = useState('');

  const handlePasswordReset = () => {
    if (!email) {
      Alert.alert('Error', 'Por favor, introduce tu correo electrónico.');
      return;
    }
    // Aquí iría la lógica para llamar a tu API y solicitar el reseteo
    console.log('Solicitando reseteo para:', email);
    Alert.alert(
      'Solicitud Enviada',
      'Si existe una cuenta con ese correo, recibirás un email con instrucciones.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Recuperar Contraseña</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Introduce tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.
      </Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        placeholder="tu@email.com"
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handlePasswordReset}>
        <Text style={styles.buttonText}>Enviar Solicitud</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.buttonSecondary, { borderColor: colors.border }]} onPress={() => router.back()}>
        <Text style={[styles.buttonSecondaryText, { color: colors.primary }]}>Volver a Inicio de Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonSecondary: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
