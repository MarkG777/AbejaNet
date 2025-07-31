import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Button, Alert } from 'react-native';
import { router } from 'expo-router';

export default function ForgotPasswordScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Contraseña</Text>
      <Text style={styles.subtitle}>
        Introduce tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="tu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title="Enviar Solicitud" onPress={handlePasswordReset} />
      <Button title="Volver a Inicio de Sesión" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
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
    color: '#666',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
});
