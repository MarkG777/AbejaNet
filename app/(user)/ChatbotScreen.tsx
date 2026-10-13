import { BeeMascot } from '@/components/BeeMascot';
import { useAppColors } from '@/hooks/useAppColors';
import api from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
  error?: boolean;
  retryQuestion?: string;
}

const SUGGESTION_KEYS = ['chatbot_suggestion_1', 'chatbot_suggestion_2', 'chatbot_suggestion_3'] as const;

export default function ChatbotScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const idCounter = useRef(0);

  const nextId = () => `m-${Date.now()}-${idCounter.current++}`;

  // RF-04 / E2: mensaje de error controlado según la causa, sin tumbar el resto de la app.
  const resolveErrorText = (err: unknown): string => {
    if (isAxiosError(err)) {
      if (err.response?.status === 429) {
        return err.response.data?.message || t('chatbot_error_rate_limit', 'Demasiadas preguntas. Espera un momento.');
      }
      if (err.response) {
        return t('chatbot_error_service', 'El asistente no está disponible en este momento.');
      }
    }
    // Sin err.response: sin conexión, timeout, o la URL de la API no está configurada.
    return t('chatbot_error_network', 'No se pudo conectar con el asistente. Revisa tu conexión.');
  };

  // Nota: cada llamada es una pregunta independiente para el backend (backend/chatbot.js no
  // recibe ni mantiene historial entre peticiones). El historial que se ve aquí es solo visual.
  const askBackend = async (question: string, targetId: string) => {
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; respuesta: string }>(
        '/api/chatbot',
        { pregunta: question },
        { timeout: 20000 }
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, pending: false, error: false, text: res.data.respuesta } : m))
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? { ...m, pending: false, error: true, text: resolveErrorText(err), retryQuestion: question }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const sendQuestion = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || sending) return; // A1: sin texto, no se envía nada.
    const userId = nextId();
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text: trimmed },
      { id: assistantId, role: 'assistant', text: '', pending: true },
    ]);
    setInput('');
    askBackend(trimmed, assistantId);
  };

  const handleRetry = (targetId: string, question: string) => {
    setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, pending: true, error: false } : m)));
    askBackend(question, targetId);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.rowOut}>
          <View style={[styles.bubble, styles.bubbleOut, { backgroundColor: colors.accent }]}>
            <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.rowIn}>
        <View style={styles.avatarSmall}>
          <BeeMascot size={22} />
        </View>
        <View
          style={[
            styles.bubble,
            styles.bubbleIn,
            { backgroundColor: colors.card, borderColor: colors.border },
            item.error && { borderColor: colors.danger },
          ]}
        >
          {item.pending ? (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          ) : (
            <>
              <Text style={[styles.bubbleText, { color: item.error ? colors.danger : colors.text }]}>{item.text}</Text>
              {item.error && item.retryQuestion && (
                <TouchableOpacity onPress={() => handleRetry(item.id, item.retryQuestion!)} style={styles.retryButton}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.retryText, { color: colors.primary }]}>{t('chatbot_retry', 'Reintentar')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BeeMascot size={64} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('chatbot_welcome', '¡Zumba zumba! ¿En qué colmena te ayudo hoy?')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {t('chatbot_subtitle', 'Pregúntame sobre tus colmenas y alertas')}
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTION_KEYS.map((key) => (
          <Pressable
            key={key}
            style={[styles.suggestionChip, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
            onPress={() => sendQuestion(t(key))}
          >
            <Text style={[styles.suggestionText, { color: colors.text }]}>{t(key)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const isSendDisabled = sending || input.trim().length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerText,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <View style={styles.headerTitleRow}>
              <View style={styles.headerAvatar}>
                <BeeMascot size={22} />
              </View>
              <Text style={[styles.headerTitleText, { color: colors.headerText }]}>Abeja Asistente</Text>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={messages.length === 0 ? styles.listEmptyContainer : styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.inputText }]}
            placeholder={t('chatbot_placeholder', 'Escribe tu pregunta...')}
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            onPress={() => sendQuestion(input)}
            disabled={isSendDisabled}
            style={[styles.sendButton, { backgroundColor: colors.primary }, isSendDisabled && styles.sendButtonDisabled]}
            accessibilityLabel={t('chatbot_send', 'Enviar')}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: { fontSize: 17, fontWeight: 'bold' },
  listContainer: { padding: 12 },
  listEmptyContainer: { flexGrow: 1 },
  rowIn: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  rowOut: { alignItems: 'flex-end', marginBottom: 10 },
  avatarSmall: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
  bubbleIn: { borderWidth: 1, borderBottomLeftRadius: 4, maxWidth: '78%', flexShrink: 1 },
  bubbleOut: { borderBottomRightRadius: 4, maxWidth: '80%' },
  bubbleText: { fontSize: 14.5, lineHeight: 20 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  retryText: { fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  suggestions: { gap: 8, width: '100%', marginTop: 10 },
  suggestionChip: { borderWidth: 1, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
  suggestionText: { fontSize: 13.5, textAlign: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 8, paddingHorizontal: 4 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
});
