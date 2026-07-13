import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../utils/api';

interface BitacoraEvent {
  id: number;
  usuario_id: number;
  apiario_id: number;
  apiario_nombre: string;
  fecha: string;
  tipo_evento: string;
  descripcion: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { key: 'revision', icon: 'search-outline' },
  { key: 'cosecha', icon: 'water-outline' },
  { key: 'alimentacion', icon: 'nutrition-outline' },
  { key: 'tratamiento', icon: 'medkit-outline' },
  { key: 'division', icon: 'git-branch-outline' },
  { key: 'observacion', icon: 'eye-outline' },
  { key: 'otro', icon: 'create-outline' },
];

export default function BitacoraScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const router = useRouter();

  const [events, setEvents] = useState<BitacoraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BitacoraEvent | null>(null);
  const [selectedType, setSelectedType] = useState('revision');
  const [descripcion, setDescripcion] = useState('');
  const [selectedApiario, setSelectedApiario] = useState<number | null>(null);
  const [apiarios, setApiarios] = useState<{ id: number; nombre: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    const perfStart = performance.now();
    setLoading(true);
    try {
      const res = await api.get('/api/bitacora');
      if (res.data.success) {
        setEvents(res.data.events);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('error_server', 'No se pudo contactar al servidor'), visibilityTime: 4000 });
    } finally {
      setLoading(false);
      console.log(`[PERF] Bitácora fetch: ${(performance.now() - perfStart).toFixed(0)}ms`);
    }
  }, [t]);

  const fetchApiarios = useCallback(async () => {
    try {
      const res = await api.get('/api/apiarios');
      if (res.data.success) {
        setApiarios(res.data.apiarios.map((a: any) => ({ id: a.id, nombre: a.nombre })));
      }
    } catch (err) {
      console.error('Error al cargar apiarios:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchApiarios();
    }, [fetchEvents, fetchApiarios])
  );

  const openModal = (event?: BitacoraEvent) => {
    if (event) {
      setEditingEvent(event);
      setSelectedType(event.tipo_evento);
      setDescripcion(event.descripcion || '');
      setSelectedApiario(event.apiario_id);
    } else {
      setEditingEvent(null);
      setSelectedType('revision');
      setDescripcion('');
      setSelectedApiario(apiarios.length > 0 ? apiarios[0].id : null);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedApiario) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('bitacora_select_apiary', 'Selecciona un apiario.'), visibilityTime: 4000 });
      return;
    }
    setSaving(true);
    try {
      if (editingEvent) {
        await api.put(`/api/bitacora/${editingEvent.id}`, {
          tipo_evento: selectedType,
          descripcion,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Toast.show({ type: 'success', text1: t('success', 'Éxito'), text2: t('bitacora_updated', 'Evento actualizado.'), visibilityTime: 3000 });
      } else {
        await api.post('/api/bitacora', {
          apiario_id: selectedApiario,
          tipo_evento: selectedType,
          descripcion,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Toast.show({ type: 'success', text1: t('success', 'Éxito'), text2: t('bitacora_created', 'Evento registrado.'), visibilityTime: 3000 });
      }
      setModalVisible(false);
      fetchEvents();
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('bitacora_error', 'No se pudo guardar el evento.'), visibilityTime: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (event: BitacoraEvent) => {
    Alert.alert(
      t('bitacora_delete_confirm', 'Eliminar evento'),
      t('bitacora_delete_msg', '¿Estás seguro de que quieres eliminar este evento?'),
      [
        { text: t('cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('delete', 'Eliminar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/bitacora/${event.id}`);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Toast.show({ type: 'success', text1: t('success', 'Éxito'), text2: t('bitacora_deleted', 'Evento eliminado.'), visibilityTime: 3000 });
              fetchEvents();
            } catch (err) {
              Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('bitacora_delete_error', 'No se pudo eliminar.'), visibilityTime: 4000 });
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getEventIcon = (tipo: string) => {
    const found = EVENT_TYPES.find(e => e.key === tipo);
    return found ? found.icon : 'create-outline';
  };

  const renderEvent = ({ item }: { item: BitacoraEvent }) => (
    <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventTypeContainer}>
          <Ionicons name={getEventIcon(item.tipo_evento) as any} size={20} color={colors.primary} />
          <Text style={[styles.eventType, { color: colors.text }]}>
            {t(`bitacora_type_${item.tipo_evento}`, item.tipo_evento)}
          </Text>
        </View>
        <Text style={[styles.eventDate, { color: colors.textTertiary }]}>{formatDate(item.fecha)}</Text>
      </View>
      {item.descripcion ? (
        <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>{item.descripcion}</Text>
      ) : null}
      <View style={styles.eventFooter}>
        <Text style={[styles.eventApiary, { color: colors.textTertiary }]}>{item.apiario_nombre}</Text>
        <View style={styles.eventActions}>
          <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('bitacora_title', 'Bitácora Apícola')}</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={60} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            {t('bitacora_empty', 'No hay eventos registrados. Toca + para agregar el primero.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEvent ? t('bitacora_edit', 'Editar Evento') : t('bitacora_new', 'Nuevo Evento')}
            </Text>

            {!editingEvent && (
              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t('bitacora_apiary', 'Apiario')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.apiaryScroll}>
                  {apiarios.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => setSelectedApiario(a.id)}
                      style={[
                        styles.apiaryChip,
                        {
                          backgroundColor: selectedApiario === a.id ? colors.primary : colors.card,
                          borderColor: selectedApiario === a.id ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={{ color: selectedApiario === a.id ? '#fff' : colors.text, fontSize: 13 }}>
                        {a.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t('bitacora_event_type', 'Tipo de Evento')}</Text>
            <View style={styles.typeGrid}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setSelectedType(type.key)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selectedType === type.key ? colors.primary : colors.card,
                      borderColor: selectedType === type.key ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Ionicons name={type.icon as any} size={18} color={selectedType === type.key ? '#fff' : colors.text} />
                  <Text style={{ color: selectedType === type.key ? '#fff' : colors.text, fontSize: 12, marginLeft: 4 }}>
                    {t(`bitacora_type_${type.key}`, type.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t('bitacora_description', 'Descripción')}</Text>
            <TextInput
              style={[styles.descInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
              placeholder={t('bitacora_desc_placeholder', 'Notas sobre el evento...')}
              placeholderTextColor={colors.placeholder}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>{t('cancel', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{t('save', 'Guardar')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12 },
  backBtn: { padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { padding: 5 },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 15 },
  eventCard: { borderRadius: 12, padding: 15, marginBottom: 10 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventType: { fontSize: 15, fontWeight: '600' },
  eventDate: { fontSize: 13 },
  eventDesc: { fontSize: 14, marginBottom: 8 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventApiary: { fontSize: 12 },
  eventActions: { flexDirection: 'row', gap: 15 },
  actionBtn: { padding: 5 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 15 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  pickerContainer: { marginBottom: 15 },
  pickerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  apiaryScroll: { flexDirection: 'row' },
  apiaryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1 },
  descInput: { borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, borderWidth: 1, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
