import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SearchBar from '../../components/SearchBar';
import { Card, RoleSectionHeader, FormModalSheet, LookupSelectField, StatusPill } from '../../components';
import {
  CampesinoFiltroResultadoRecord,
  FormularioFilterQuestionRecord,
  FormularioPayload,
  FormularioRecord,
  createFormulario,
  deleteFormulario,
  listCampesinosByFormularioFilter,
  listFormularioFilterQuestions,
  listFormularios,
  listUsuarios,
  updateFormulario,
  UsuarioRecord,
} from '../../services/adminService';
import { parseFormStructure } from '../../services/encuestadorFormService';
import { FormQuestion, FormQuestionOption } from '../../types/formularios';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';
import { exportTableToExcelCsv } from '../../utils/excelExport';
import { sharedFormStyles } from '../../styles/sharedFormStyles';

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
  useAsFilter: boolean;
  placeholder: string;
  options: FormQuestionOption[];
};

type FormEditorState = {
  titulo: string;
  version: string;
  activo: boolean;
  preguntas: QuestionDraft[];
};

function createQuestionDraft(index: number, existingId?: string): QuestionDraft {
  return {
    id: existingId || `pregunta_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    kind: 'text',
    required: false,
    useAsFilter: false,
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
    id: String(question.id || `pregunta_${index + 1}`),
    label: question.label || '',
    kind: mapQuestionKind(question),
    required: question.required,
    useAsFilter: Boolean(question.useAsFilter),
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
      const questionId = String(question.id || `pregunta_${index + 1}`).trim();
      const base: Record<string, unknown> = {
        id: questionId,
        label: normalizedLabel,
        required: question.required,
        use_as_filter: question.useAsFilter,
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
  const [filterQuestions, setFilterQuestions] = useState<FormularioFilterQuestionRecord[]>([]);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('');
  const [filterResults, setFilterResults] = useState<CampesinoFiltroResultadoRecord[]>([]);
  const [loadingFilterResults, setLoadingFilterResults] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FormularioRecord | null>(null);
  const [form, setForm] = useState<FormEditorState>(createEmptyEditorState());

  const buildFilterKey = (formularioId: string, preguntaId: string) => `${formularioId}::${preguntaId}`;

  const load = async () => {
    if (!token) return;

    const [formularios, preguntasFiltro] = await Promise.all([
      listFormularios(token),
      listFormularioFilterQuestions(token),
    ]);

    setItems(formularios);
    setFilterQuestions(preguntasFiltro);
    if (selectedFilterKey) {
      const stillExists = preguntasFiltro.some(
        (item) => buildFilterKey(item.formulario_id, item.pregunta_id) === selectedFilterKey,
      );
      if (!stillExists) {
        setSelectedFilterKey('');
        setFilterResults([]);
      }
    }
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
    const text = (search || '').toLowerCase();
    return items.filter((item) => (item.titulo || '').toLowerCase().includes(text));
  }, [items, search]);

  const filterQuestionOptions = useMemo(
    () => filterQuestions
      .map((item) => ({
        label: item.pregunta_label,
        value: buildFilterKey(item.formulario_id, item.pregunta_id),
        description: item.formulario_titulo,
      }))
      .sort((a, b) => {
        const byFormulario = (a.description || '').localeCompare(b.description || '', 'es', { sensitivity: 'base' });
        if (byFormulario !== 0) {
          return byFormulario;
        }

        return (a.label || '').localeCompare(b.label || '', 'es', { sensitivity: 'base' });
      }),
    [filterQuestions],
  );

  const selectedFilterQuestion = useMemo(
    () =>
      filterQuestions.find(
        (item) => buildFilterKey(item.formulario_id, item.pregunta_id) === selectedFilterKey,
      ) || null,
    [filterQuestions, selectedFilterKey],
  );

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
      if (editing?.id) {
        await updateFormulario(token, editing.id, payload);
      } else {
        await createFormulario(token, payload);
      }
      setEditing(null);
      setForm(createEmptyEditorState());
      setModal(false);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    }
  };

  const remove = (item: FormularioRecord) => {
    if (!token) return;
    if (!item?.id) {
      Alert.alert('Error', 'El formulario no tiene ID válido para eliminar. Recarga la lista e intenta de nuevo.');
      return;
    }
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

  const exportExcel = async () => {
    try {
      const fileUri = await exportTableToExcelCsv({
        filePrefix: 'formularios',
        columns: [
          { key: 'titulo', title: 'Titulo' },
          { key: 'version', title: 'Version' },
          { key: 'activo', title: 'Activo' },
        ],
        rows: filtered.map((item) => ({
          titulo: item.titulo,
          version: item.version,
          activo: item.activo ? 'Si' : 'No',
        })),
      });

      Alert.alert('Archivo Excel generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el archivo Excel';
      Alert.alert('Error', message);
    }
  };

  const selectFilterQuestion = async (question: FormularioFilterQuestionRecord) => {
    if (!token) return;

    const key = buildFilterKey(question.formulario_id, question.pregunta_id);
    if (key === selectedFilterKey) {
      setSelectedFilterKey('');
      setFilterResults([]);
      return;
    }

    setSelectedFilterKey(key);
    setLoadingFilterResults(true);

    try {
      const results = await listCampesinosByFormularioFilter(
        token,
        question.formulario_id,
        question.pregunta_id,
      );
      setFilterResults(results);
    } catch (error: any) {
      setFilterResults([]);
      Alert.alert('Error', error.message || 'No se pudieron cargar los resultados del filtro');
    } finally {
      setLoadingFilterResults(false);
    }
  };

  const selectFilterQuestionByKey = async (key: string) => {
    if (!key) {
      setSelectedFilterKey('');
      setFilterResults([]);
      return;
    }

    const selected = filterQuestions.find(
      (item) => buildFilterKey(item.formulario_id, item.pregunta_id) === key,
    );

    if (!selected) {
      setSelectedFilterKey('');
      setFilterResults([]);
      return;
    }

    await selectFilterQuestion(selected);
  };

  const exportFilterResultsPdf = async () => {
    if (!selectedFilterQuestion) {
      Alert.alert('Filtros', 'Selecciona una pregunta de filtro primero');
      return;
    }

    try {
      const fileUri = await exportTableToPdf({
        title: 'Campesinos filtrados por pregunta',
        subtitle: selectedFilterQuestion.formulario_titulo,
        filePrefix: 'campesinos-filtrados',
        filters: [
          { label: 'Formulario', value: selectedFilterQuestion.formulario_titulo },
          { label: 'Pregunta', value: selectedFilterQuestion.pregunta_label },
        ],
        columns: [
          { key: 'cedula', title: 'Cédula' },
          { key: 'nombre_completo', title: 'Nombre completo' },
          { key: 'consejo', title: 'Consejo' },
          { key: 'valor', title: 'Respuesta' },
          { key: 'capturado_en', title: 'Fecha captura' },
        ],
        rows: filterResults.map((item) => ({
          cedula: item.cedula,
          nombre_completo: `${item.nombre} ${item.apellido || ''}`.trim(),
          consejo: item.consejo_nombre || '-',
          valor: item.valor,
          capturado_en: item.capturado_en ? new Date(item.capturado_en).toLocaleString() : '-',
        })),
      });

      Alert.alert('PDF generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
      Alert.alert('Error', message);
    }
  };

  const exportFilterResultsExcel = async () => {
    if (!selectedFilterQuestion) {
      Alert.alert('Filtros', 'Selecciona una pregunta de filtro primero');
      return;
    }

    try {
      const fileUri = await exportTableToExcelCsv({
        filePrefix: 'campesinos-filtrados',
        columns: [
          { key: 'cedula', title: 'Cedula' },
          { key: 'nombre_completo', title: 'Nombre completo' },
          { key: 'consejo', title: 'Consejo' },
          { key: 'valor', title: 'Respuesta' },
          { key: 'capturado_en', title: 'Fecha captura' },
        ],
        rows: filterResults.map((item) => ({
          cedula: item.cedula,
          nombre_completo: `${item.nombre} ${item.apellido || ''}`.trim(),
          consejo: item.consejo_nombre || '-',
          valor: item.valor,
          capturado_en: item.capturado_en ? new Date(item.capturado_en).toLocaleString() : '-',
        })),
      });

      Alert.alert('Archivo Excel generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el archivo Excel';
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
    <View style={sharedFormStyles.pageContainer}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar formulario por nombre"
      />
      <RoleSectionHeader
        title="Formularios"
        subtitle="Administra los formularios activos del sistema."
        actions={
          <>
            <TouchableOpacity style={sharedFormStyles.smallButton} onPress={exportPdf}>
              <Text style={sharedFormStyles.smallButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sharedFormStyles.smallButton} onPress={exportExcel}>
              <Text style={sharedFormStyles.smallButtonText}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sharedFormStyles.primaryButton} onPress={openCreate}>
              <Text style={sharedFormStyles.primaryButtonText}>Crear</Text>
            </TouchableOpacity>
          </>
        }
      />

      <Card style={styles.filtersCard}>
        <View style={styles.filtersHeaderRow}>
          <View>
            <Text style={styles.filtersTitle}>Filtros</Text>
            <Text style={styles.filtersSubtitle}>
              Preguntas marcadas con "usar como filtro".
            </Text>
          </View>
          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={sharedFormStyles.smallButton}
              onPress={exportFilterResultsPdf}
              disabled={!selectedFilterQuestion || !filterResults.length}
            >
              <Text
                style={[
                  sharedFormStyles.smallButtonText,
                  !selectedFilterQuestion || !filterResults.length ? styles.disabledButtonText : null,
                ]}
              >
                PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={sharedFormStyles.smallButton}
              onPress={exportFilterResultsExcel}
              disabled={!selectedFilterQuestion || !filterResults.length}
            >
              <Text
                style={[
                  sharedFormStyles.smallButtonText,
                  !selectedFilterQuestion || !filterResults.length ? styles.disabledButtonText : null,
                ]}
              >
                Excel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filterQuestions.length ? (
          <LookupSelectField
            label="Pregunta de filtro"
            value={selectedFilterKey}
            options={filterQuestionOptions}
            onChange={selectFilterQuestionByKey}
            placeholder="Selecciona una pregunta"
            searchPlaceholder="Buscar pregunta o formulario..."
            allowClear
            clearLabel="Quitar filtro"
          />
        ) : (
          <Text style={styles.helperText}>No hay preguntas configuradas como filtro.</Text>
        )}

        {selectedFilterQuestion ? (
          <View style={styles.filterResultsWrapper}>
            <Text style={styles.filterResultTitle}>Campesinos encontrados: {filterResults.length}</Text>
            {loadingFilterResults ? (
              <Text style={styles.helperText}>Cargando resultados...</Text>
            ) : filterResults.length ? (
              filterResults.map((item) => (
                <View key={`${item.campesino_id}-${item.pregunta_id}`} style={styles.filterResultRow}>
                  <View style={styles.filterResultMain}>
                    <Text style={styles.filterResultName}>{item.nombre} {item.apellido || ''}</Text>
                    <Text style={styles.filterResultMeta}>CI: {item.cedula} · Consejo: {item.consejo_nombre || '-'}</Text>
                  </View>
                  <Text style={styles.filterResultValue}>{item.valor}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>Sin resultados para esta pregunta.</Text>
            )}
          </View>
        ) : null}
      </Card>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? `${item.titulo || 'formulario'}-${index}`)}
        contentContainerStyle={sharedFormStyles.listContent}
        ListEmptyComponent={<Text style={sharedFormStyles.emptyText}>No hay formularios</Text>}
        renderItem={({ item }) => {
          const questionCount = parseFormStructure(item.estructura).preguntas.length;

          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleGroup}>
                  <Text style={styles.itemTitle}>{item.titulo}</Text>
                  <Text style={styles.itemSubtitle}>Versión {item.version}</Text>
                </View>
                <StatusPill label={item.activo ? 'Activo' : 'Inactivo'} tone={item.activo ? 'success' : 'danger'} />
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.metaLabel}>Preguntas</Text>
                <Text style={styles.metaValue}>{questionCount}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.metaLabel}>Creado por</Text>
                <Text style={styles.metaValue}>{item.creado_por ? (userNameById.get(item.creado_por) || item.creado_por) : 'N/A'}</Text>
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

      <FormModalSheet
        visible={modal}
        title={editing ? 'Editar formulario' : 'Nuevo formulario'}
        onClose={() => setModal(false)}
        onSave={save}
      >
            <View style={styles.modalScrollContent}>
              <TextInput
                value={form.titulo}
                onChangeText={(value) => setForm((current) => ({ ...current, titulo: value }))}
                style={sharedFormStyles.input}
                placeholder="Nombre del formulario"
              />

              <TextInput
                value={form.version}
                onChangeText={(value) => setForm((current) => ({ ...current, version: value }))}
                style={sharedFormStyles.input}
                placeholder="Versión"
                keyboardType="numeric"
              />

              <View style={sharedFormStyles.switchRow}>
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

              {form.preguntas.map((question, index) => {
                const questionKey = question.id || `pregunta_${index + 1}`;
                return (
                <View key={questionKey} style={styles.questionCard}>
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
                    style={sharedFormStyles.input}
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

                  <View style={sharedFormStyles.switchRow}>
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

                  <View style={sharedFormStyles.switchRow}>
                    <Text style={styles.switchLabel}>Usar como filtro</Text>
                    <Switch
                      value={question.useAsFilter}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          preguntas: updateQuestion(current.preguntas, index, (item) => ({ ...item, useAsFilter: value })),
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
                      style={sharedFormStyles.input}
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
                          <View key={`${question.id || `pregunta_${index + 1}`}-option-${optionIndex}`} style={styles.optionRow}>
                            <TextInput
                              value={option.label}
                              onChangeText={(value) => updateOption(index, optionIndex, 'label', value)}
                              style={[sharedFormStyles.input, styles.optionInput]}
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
                );
              })}
            </View>
      </FormModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionSubtitle: { color: '#475569', marginTop: 4 },
  filtersCard: { marginBottom: 12 },
  filtersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  filterActionsRow: { flexDirection: 'row', gap: 8 },
  filtersTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  filtersSubtitle: { color: '#64748b', marginTop: 4 },
  filterResultsWrapper: { marginTop: 8, gap: 8 },
  filterResultTitle: { color: '#0f172a', fontWeight: '800' },
  filterResultRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  filterResultMain: { gap: 2 },
  filterResultName: { color: '#0f172a', fontWeight: '700' },
  filterResultMeta: { color: '#64748b', fontSize: 12 },
  filterResultValue: { color: '#0f766e', fontWeight: '700' },
  disabledButtonText: { color: '#94a3b8' },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  itemTitleGroup: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  itemSubtitle: { color: '#64748b', marginTop: 4 },
  itemMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  metaLabel: { color: '#94a3b8', fontWeight: '700' },
  metaValue: { color: '#0f172a', fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: 16 },
  link: { color: '#2563eb', fontWeight: '700' },
  danger: { color: '#b91c1c' },
  
  modalScrollContent: { gap: 12, paddingBottom: 12 },
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
});
