import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SearchBar from '../../components/SearchBar';
import { Card } from '../../components';
import {
  FormularioPayload,
  FormularioRecord,
  createFormulario,
  deleteFormulario,
  listFormularios,
  listUsuarios,
  updateFormulario,
  UsuarioRecord,
} from '../../services/adminService';
import { parseFormStructure } from '../../services/encuestadorFormService';
import { FormQuestion, FormQuestionOption } from '../../types/formularios';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';

const QUESTION_TYPE_OPTIONS = [
  { key: 'text', label: 'Texto' },
  { key: 'number', label: 'Número' },
  { key: 'date', label: 'Fecha' },
  { key: 'select_single', label: 'Selección única' },
  { key: 'select_multiple', label: 'Selección múltiple' },
] as const;

type QuestionKind = (typeof QUESTION_TYPE_OPTIONS)[number]['key'];

type QuestionDraft = {
  id: string;
  label: string;
  kind: QuestionKind;
  required: boolean;
  placeholder: string;
  options: FormQuestionOption[];
};

type FormEditorState = {
  titulo: string;
  version: string;
  activo: boolean;
  preguntas: QuestionDraft[];
};

function createQuestionDraft(index: number): QuestionDraft {
  return {
    id: `pregunta_${Date.now()}_${index + 1}`,
    label: '',
    kind: 'text',
    required: false,
    placeholder: '',
    options: [],
  };
}

function mapQuestionKind(question: FormQuestion): QuestionKind {
  if (question.type === 'select') {
    return question.selectionMode === 'multiple' ? 'select_multiple' : 'select_single';
  }

  if (question.type === 'textarea') {
    return 'text';
  }

  return (question.type as QuestionKind) || 'text';
}

function mapQuestionToDraft(question: FormQuestion, index: number): QuestionDraft {
  return {
    id: question.id || `pregunta_${index + 1}`,
    label: question.label || '',
    kind: mapQuestionKind(question),
    required: question.required,
    placeholder: question.placeholder || '',
    options: question.options && question.options.length ? question.options : [],
  };
}

function createEmptyEditorState(): FormEditorState {
  return {
    titulo: '',
    version: '1',
    activo: true,
    preguntas: [createQuestionDraft(0)],
  };
}

function mapRecordToEditorState(item: FormularioRecord): FormEditorState {
  const structure = parseFormStructure(item.estructura);
  const preguntas = structure.preguntas.length
    ? structure.preguntas.map((question, index) => mapQuestionToDraft(question, index))
    : [createQuestionDraft(0)];

  return {
    titulo: item.titulo,
    version: String(item.version),
    activo: item.activo,
    preguntas,
  };
}

function mapDraftsToStructure(preguntas: QuestionDraft[]): Record<string, unknown> {
  return {
    preguntas: preguntas.map((question, index) => {
      const normalizedLabel = question.label.trim();
      const normalizedPlaceholder = question.placeholder.trim();
      const normalizedOptions = question.options
        .map((option) => ({
          label: String(option.label || '').trim(),
          value: String(option.value || '').trim(),
        }))
        .filter((option) => option.label || option.value)
        .map((option) => ({
          label: option.label || option.value,
          value: option.value || option.label,
        }));

      const isSelect = question.kind === 'select_single' || question.kind === 'select_multiple';
      const base: Record<string, unknown> = {
        id: question.id || `pregunta_${index + 1}`,
        label: normalizedLabel,
        required: question.required,
      };

      if (question.kind === 'text') {
        base.type = 'text';
      } else if (question.kind === 'number') {
        base.type = 'number';
      } else if (question.kind === 'date') {
        base.type = 'date';
      } else if (isSelect) {
        base.type = 'select';
        base.selectionMode = question.kind === 'select_multiple' ? 'multiple' : 'single';
        base.options = normalizedOptions;
      }

      if (normalizedPlaceholder) {
        base.placeholder = normalizedPlaceholder;
      }

      return base;
    }),
  };
}

function updateQuestion(
  preguntas: QuestionDraft[],
  index: number,
  updater: (question: QuestionDraft) => QuestionDraft,
): QuestionDraft[] {
  return preguntas.map((question, currentIndex) => (currentIndex === index ? updater(question) : question));
}

function isSelectKind(kind: QuestionKind): boolean {
  return kind === 'select_single' || kind === 'select_multiple';
}

export default function AdminFormulariosScreen() {
  const { token, user } = useAuthStore();
  const [items, setItems] = useState<FormularioRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FormularioRecord | null>(null);
  const [form, setForm] = useState<FormEditorState>(createEmptyEditorState());

  const load = async () => {
    if (!token) return;
    setItems(await listFormularios(token));
  };

  useEffect(() => {
    load().catch((error) => Alert.alert('Error', error.message || 'No se pudo cargar formularios'));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    listUsuarios(token)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [token]);

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, `${item.nombre} ${item.apellido}`] as const)),
    [users],
  );

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return items.filter((item) => item.titulo.toLowerCase().includes(text));
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(createEmptyEditorState());
    setModal(true);
  };

  const openEdit = (item: FormularioRecord) => {
    setEditing(item);
    setForm(mapRecordToEditorState(item));
    setModal(true);
  };

  const save = async () => {
    if (!token || !user) return;

    if (!form.titulo.trim()) {
      Alert.alert('Validación', 'El título es obligatorio');
      return;
    }

    if (!form.preguntas.length) {
      Alert.alert('Validación', 'Debes agregar al menos una pregunta');
      return;
    }

    for (const question of form.preguntas) {
      if (!question.label.trim()) {
        Alert.alert('Validación', 'Todas las preguntas deben tener texto');
        return;
      }

      if (isSelectKind(question.kind)) {
        const validOptions = question.options.filter((option) => option.label.trim() || option.value.trim());
        if (!validOptions.length) {
          Alert.alert('Validación', `La pregunta "${question.label}" necesita al menos una opción`);
          return;
        }
      }
    }

    const payload: FormularioPayload = {
      titulo: form.titulo.trim(),
      version: Number(form.version) || 1,
      estructura: mapDraftsToStructure(form.preguntas),
      activo: form.activo,
      creado_por: user.id,
    };

    try {
      if (editing) {
        await updateFormulario(token, editing.id, payload);
      } else {
        await createFormulario(token, payload);
      }
      setModal(false);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    }
  };

  const remove = (item: FormularioRecord) => {
    if (!token) return;
    Alert.alert('Eliminar', `¿Eliminar formulario ${item.titulo}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFormulario(token, item.id);
            await load();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const exportPdf = async () => {
    try {
      const fileUri = await exportTableToPdf({
        title: 'Reporte de Formularios',
        subtitle: 'CensoCampesino - Administración',
        filePrefix: 'formularios',
        filters: [{ label: 'Búsqueda', value: search || 'Sin filtro' }],
        columns: [
          { key: 'titulo', title: 'Título' },
          { key: 'version', title: 'Versión' },
          { key: 'activo', title: 'Activo' },
        ],
        rows: filtered.map((item) => ({
          titulo: item.titulo,
          version: item.version,
          activo: item.activo ? 'Sí' : 'No',
        })),
      });

      Alert.alert('PDF generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
      Alert.alert('Error', message);
    }
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      preguntas: [...current.preguntas, createQuestionDraft(current.preguntas.length)],
    }));
  };

  const removeQuestion = (index: number) => {
    setForm((current) => {
      const nextQuestions = current.preguntas.filter((_, currentIndex) => currentIndex !== index);
      return {
        ...current,
        preguntas: nextQuestions.length ? nextQuestions : [createQuestionDraft(0)],
      };
    });
  };

  const updateQuestionKind = (index: number, kind: QuestionKind) => {
    setForm((current) => ({
      ...current,
      preguntas: updateQuestion(current.preguntas, index, (question) => ({
        ...question,
        kind,
        options: isSelectKind(kind) ? question.options : [],
      })),
    }));
  };

  const addOption = (questionIndex: number) => {
    setForm((current) => ({
      ...current,
      preguntas: updateQuestion(current.preguntas, questionIndex, (question) => ({
        ...question,
        options: [...question.options, { label: '', value: '' }],
      })),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: 'label' | 'value', value: string) => {
    setForm((current) => ({
      ...current,
      preguntas: updateQuestion(current.preguntas, questionIndex, (question) => ({
        ...question,
        options: question.options.map((option, currentIndex) =>
          currentIndex === optionIndex ? { ...option, [field]: value } : option,
        ),
      })),
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setForm((current) => ({
      ...current,
      preguntas: updateQuestion(current.preguntas, questionIndex, (question) => ({
        ...question,
        options: question.options.filter((_, currentIndex) => currentIndex !== optionIndex),
      })),
    }));
  };

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar formulario por nombre" />
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.sectionTitle}>Formularios</Text>
          <Text style={styles.sectionSubtitle}>Administra los formularios activos del sistema.</Text>
        </View>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.smallButton} onPress={exportPdf}>
            <Text style={styles.smallButtonText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
            <Text style={styles.primaryButtonText}>Crear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay formularios</Text>}
        renderItem={({ item }) => {
          const questionCount = parseFormStructure(item.estructura).preguntas.length;

          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleGroup}>
                  <Text style={styles.itemTitle}>{item.titulo}</Text>
                  <Text style={styles.itemSubtitle}>Versión {item.version}</Text>
                </View>
                <View style={[styles.statusBadge, item.activo ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.metaLabel}>Preguntas</Text>
                <Text style={styles.metaValue}>{questionCount}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.metaLabel}>Creado por</Text>
                <Text style={styles.metaValue}>{userNameById.get(item.creado_por) || item.creado_por}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Text style={styles.link}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Text style={[styles.link, styles.danger]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Editar formulario' : 'Nuevo formulario'}</Text>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <TextInput
                value={form.titulo}
                onChangeText={(value) => setForm((current) => ({ ...current, titulo: value }))}
                style={styles.input}
                placeholder="Nombre del formulario"
              />

              <TextInput
                value={form.version}
                onChangeText={(value) => setForm((current) => ({ ...current, version: value }))}
                style={styles.input}
                placeholder="Versión"
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Formulario activo</Text>
                <Switch
                  value={form.activo}
                  onValueChange={(value) => setForm((current) => ({ ...current, activo: value }))}
                />
              </View>

              <View style={styles.questionsSectionHeader}>
                <Text style={styles.questionsTitle}>Preguntas</Text>
                <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
                  <Text style={styles.addQuestionButtonText}>Agregar otra pregunta</Text>
                </TouchableOpacity>
              </View>

              {form.preguntas.map((question, index) => (
                <View key={question.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>Pregunta {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeQuestion(index)}>
                      <Text style={styles.removeQuestionText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={question.label}
                    onChangeText={(value) =>
                      setForm((current) => ({
                        ...current,
                        preguntas: updateQuestion(current.preguntas, index, (item) => ({ ...item, label: value })),
                      }))
                    }
                    style={styles.input}
                    placeholder="Texto de la pregunta"
                  />

                  <Text style={styles.fieldLabel}>Tipo de campo</Text>
                  <View style={styles.typeGrid}>
                    {QUESTION_TYPE_OPTIONS.map((option) => {
                      const active = question.kind === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[styles.typePill, active && styles.typePillActive]}
                          onPress={() => updateQuestionKind(index, option.key)}
                        >
                          <Text style={[styles.typePillText, active && styles.typePillTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Obligatoria</Text>
                    <Switch
                      value={question.required}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          preguntas: updateQuestion(current.preguntas, index, (item) => ({ ...item, required: value })),
                        }))
                      }
                    />
                  </View>

                  {question.kind === 'text' || question.kind === 'number' || question.kind === 'date' ? (
                    <TextInput
                      value={question.placeholder}
                      onChangeText={(value) =>
                        setForm((current) => ({
                          ...current,
                          preguntas: updateQuestion(current.preguntas, index, (item) => ({ ...item, placeholder: value })),
                        }))
                      }
                      style={styles.input}
                      placeholder="Texto de ayuda o placeholder"
                    />
                  ) : null}

                  {isSelectKind(question.kind) ? (
                    <View style={styles.optionsSection}>
                      <View style={styles.optionsHeader}>
                        <Text style={styles.fieldLabel}>Opciones</Text>
                        <TouchableOpacity onPress={() => addOption(index)}>
                          <Text style={styles.addOptionText}>Agregar opción</Text>
                        </TouchableOpacity>
                      </View>

                      {question.options.length ? (
                        question.options.map((option, optionIndex) => (
                          <View key={`${question.id}-option-${optionIndex}`} style={styles.optionRow}>
                            <TextInput
                              value={option.label}
                              onChangeText={(value) => updateOption(index, optionIndex, 'label', value)}
                              style={[styles.input, styles.optionInput]}
                              placeholder={`Opción ${optionIndex + 1}`}
                            />
                            <TouchableOpacity onPress={() => removeOption(index, optionIndex)} style={styles.removeOptionButton}>
                              <Text style={styles.removeOptionText}>X</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.helperText}>Agrega al menos una opción para esta pregunta.</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save}>
                <Text style={styles.save}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f7fb' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  headerTextWrapper: { flex: 1 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { color: '#475569', marginTop: 4 },
  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  smallButton: { backgroundColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { color: '#1f2937', fontWeight: '700' },
  listContent: { paddingBottom: 120, gap: 10 },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  itemTitleGroup: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  itemMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  metaLabel: { color: '#94a3b8', fontWeight: '700' },
  metaValue: { color: '#0f172a', fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: 16 },
  link: { color: '#2563eb', fontWeight: '700' },
  danger: { color: '#b91c1c' },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalScrollContent: { gap: 12, paddingBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchLabel: { color: '#334155', fontWeight: '700' },
  questionsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 4 },
  questionsTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  addQuestionButton: { backgroundColor: '#dbeafe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  addQuestionButtonText: { color: '#1d4ed8', fontWeight: '700' },
  questionCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, gap: 10, backgroundColor: '#f8fafc' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  removeQuestionText: { color: '#b91c1c', fontWeight: '700' },
  fieldLabel: { color: '#334155', fontWeight: '700' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  typePillActive: { backgroundColor: '#0f766e' },
  typePillText: { color: '#1f2937', fontWeight: '700' },
  typePillTextActive: { color: '#fff' },
  optionsSection: { gap: 10 },
  optionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addOptionText: { color: '#2563eb', fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1 },
  removeOptionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  removeOptionText: { color: '#b91c1c', fontWeight: '800' },
  helperText: { color: '#64748b' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelText: { color: '#64748b', fontWeight: '700' },
  save: { color: '#0f766e', fontWeight: '800' },
});
