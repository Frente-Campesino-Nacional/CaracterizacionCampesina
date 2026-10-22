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
import { showErrorAlert, showSuccessAlert } from '../../utils/humanizerUtils';
import { sharedFormStyles } from '../../styles/sharedFormStyles';


const QUESTION_TYPE_OPTIONS = [
  { key: 'text', label: 'Texto' },
  { key: 'number', label: 'Número' },
  { key: 'date', label: 'Fecha' },
  { key: 'select_single', label: 'Selección única' },
  { key: 'select_multiple', label: 'Selección múltiple' },
  { key: 'rubros_agricolas', label: 'Rubros agrícolas (m²)' },
  { key: 'produccion_animal', label: 'Producción animal' },
  { key: 'carga_familiar', label: 'Carga familiar (Grupos etarios)' },
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
  isBaseSurface?: boolean;
  hasDependency?: boolean;
  dependsOnQuestionId?: string;
  dependsOnValue?: string;
};

type FormEditorState = {
  titulo: string;
  version: string;
  activo: boolean;
  preguntas: QuestionDraft[];
};

function getDefaultOptionsForKind(kind: QuestionKind): FormQuestionOption[] {
  if (kind === 'carga_familiar') {
    return [
      { label: 'Adulto Mayor (Fem. ≥ 55 | Masc. ≥ 60)', value: 'adulto_mayor' },
      { label: 'Adulto (Fem. 18-54 | Masc. 18-59)', value: 'adulto' },
      { label: 'Adolescente (12 a 17 años)', value: 'adolescente' },
      { label: 'Menor (4 a 11 años)', value: 'menor' },
      { label: 'Infante (0 a 3 años)', value: 'infante' },
    ];
  }
  if (kind === 'rubros_agricolas') {
    return [
      { label: 'Café', value: 'Café' },
      { label: 'Musáceas (Plátano/Cambur)', value: 'Musáceas' },
      { label: 'Maíz', value: 'Maíz' },
      { label: 'Yuca', value: 'Yuca' },
      { label: 'Cacao', value: 'Cacao' },
      { label: 'Hortalizas', value: 'Hortalizas' },
    ];
  }
  if (kind === 'produccion_animal') {
    return [
      { label: 'Bovino', value: 'Bovino' },
      { label: 'Porcino', value: 'Porcino' },
      { label: 'Caprino', value: 'Caprino' },
      { label: 'Ovino', value: 'Ovino' },
      { label: 'Aves (Gallinas/Pollos)', value: 'Aves' },
    ];
  }
  return [];
}

function createQuestionDraft(index: number, existingId?: string): QuestionDraft {
  return {
    id: existingId || `pregunta_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    kind: 'text',
    required: false,
    useAsFilter: true,
    placeholder: '',
    options: [],
    isBaseSurface: false,
    hasDependency: false,
    dependsOnQuestionId: '',
    dependsOnValue: '',
  };
}

function mapQuestionKind(question: FormQuestion): QuestionKind {
  if (question.type === 'select') {
    return question.selectionMode === 'multiple' ? 'select_multiple' : 'select_single';
  }

  if (question.type === 'textarea') {
    return 'text';
  }

  if (question.type === 'rubros_agricolas') {
    return 'rubros_agricolas';
  }

  if (question.type === 'produccion_animal') {
    return 'produccion_animal';
  }

  return (question.type as QuestionKind) || 'text';
}

function mapQuestionToDraft(question: FormQuestion, index: number): QuestionDraft {
  const kind = mapQuestionKind(question);
  return {
    id: String(question.id || `pregunta_${index + 1}`),
    label: question.label || '',
    kind,
    required: question.required,
    useAsFilter: Boolean(question.useAsFilter),
    placeholder: question.placeholder || '',
    options: question.options && question.options.length ? question.options : getDefaultOptionsForKind(kind),
    isBaseSurface: Boolean(question.isBaseSurface),
    hasDependency: Boolean(question.depends_on && question.depends_on.question_id),
    dependsOnQuestionId: question.depends_on?.question_id || '',
    dependsOnValue: question.depends_on?.value || '',
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
        if (question.isBaseSurface) {
          base.is_base_surface = true;
        }
      } else if (question.kind === 'date') {
        base.type = 'date';
      } else if (question.kind === 'rubros_agricolas') {
        base.type = 'rubros_agricolas';
        base.options = normalizedOptions;
      } else if (question.kind === 'produccion_animal') {
        base.type = 'produccion_animal';
        base.options = normalizedOptions;
      } else if (question.kind === 'carga_familiar') {
        base.type = 'carga_familiar';
        base.options = normalizedOptions.length > 0 ? normalizedOptions : getDefaultOptionsForKind('carga_familiar');
      } else if (isSelect) {
        base.type = 'select';
        base.selectionMode = question.kind === 'select_multiple' ? 'multiple' : 'single';
        base.options = normalizedOptions;
      }

      if (question.hasDependency && question.dependsOnQuestionId && question.dependsOnValue) {
        base.depends_on = {
          question_id: question.dependsOnQuestionId.trim(),
          value: question.dependsOnValue.trim(),
        };
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
  return (
    kind === 'select_single' ||
    kind === 'select_multiple' ||
    kind === 'rubros_agricolas' ||
    kind === 'produccion_animal'
  );
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
  const [expandedFormIds, setExpandedFormIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedFormIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const buildFilterKey = (formularioId: string, preguntaId: string) => `${formularioId}::${preguntaId}`;

  const load = async () => {
    if (!token) return;

    const results = await Promise.allSettled([
      listFormularios(token),
      listFormularioFilterQuestions(token),
    ]);

    const formularios = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
    const preguntasFiltro = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];

    const err0 = results[0].status === 'rejected' ? results[0].reason : null;
    const err1 = results[1].status === 'rejected' ? results[1].reason : null;
    const err = err0 || err1;
    if (err?.message) {
      showErrorAlert('Error al cargar datos', err.message);
    }

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
    load().catch(() => {});
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
      showErrorAlert('El título del formulario es obligatorio (*).', 'Campo requerido');
      return;
    }

    if (!form.preguntas.length) {
      showErrorAlert('Debes agregar al menos una pregunta al formulario.', 'Estructura requerida');
      return;
    }

    for (const question of form.preguntas) {
      if (!question.label.trim()) {
        showErrorAlert('Todas las preguntas deben contener un texto o enunciado.', 'Texto de pregunta requerido');
        return;
      }

      if (isSelectKind(question.kind)) {
        const validOptions = question.options.filter((option) => option.label.trim() || option.value.trim());
        if (!validOptions.length) {
          showErrorAlert(`La pregunta "${question.label}" requiere al menos una opción de respuesta.`, 'Opciones requeridas');
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
      showSuccessAlert(
        editing?.id ? 'Formulario Actualizado' : 'Formulario Creado',
        editing?.id
          ? `El formulario "${form.titulo}" ha sido actualizado correctamente.`
          : `El formulario "${form.titulo}" fue creado exitosamente.`
      );
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo guardar la estructura del formulario');
    }
  };

  const remove = (item: FormularioRecord) => {
    if (!token) return;
    if (!item?.id) {
      showErrorAlert('El formulario no tiene un ID válido para eliminar. Por favor recarga la lista.', 'ID no válido');
      return;
    }
    Alert.alert('Eliminar formulario', `¿Estás seguro de eliminar el formulario "${item.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFormulario(token, item.id);
            await load();
            showSuccessAlert('Formulario Eliminado', `El formulario "${item.titulo}" fue eliminado exitosamente.`);
          } catch (error: any) {
            showErrorAlert(error, 'No se pudo eliminar el formulario');
          }
        },
      },
    ]);
  };


  const exportPdf = async () => {
    try {
      const fileUri = await exportTableToPdf({
        title: 'Reporte de Formularios',
        subtitle: 'Producir es vencer FUNCN - Administración',
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
      preguntas: updateQuestion(current.preguntas, index, (question) => {
        let options = isSelectKind(kind) ? question.options : [];
        if ((kind === 'rubros_agricolas' || kind === 'produccion_animal') && (!options || options.length === 0)) {
          options = getDefaultOptionsForKind(kind);
        }
        return {
          ...question,
          kind,
          options,
        };
      }),
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



      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? `${item.titulo || 'formulario'}-${index}`)}
        contentContainerStyle={sharedFormStyles.listContent}
        ListEmptyComponent={<Text style={sharedFormStyles.emptyText}>No hay formularios</Text>}
        renderItem={({ item }) => {
          const parsed = parseFormStructure(item.estructura);
          const questionList = parsed.preguntas;
          const questionCount = questionList.length;
          const isExpanded = Boolean(expandedFormIds[item.id]);

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

              {isExpanded ? (
                <View style={styles.questionsPreviewWrapper}>
                  <Text style={styles.questionsPreviewHeader}>Preguntas configuradas ({questionCount}):</Text>
                  {questionList.length ? (
                    questionList.map((q, idx) => (
                      <View key={q.id || `preview_q_${idx}`} style={styles.questionPreviewCard}>
                        <View style={styles.questionPreviewHeaderRow}>
                          <Text style={styles.questionPreviewNumber}>{idx + 1}.</Text>
                          <Text style={styles.questionPreviewLabel}>{q.label}</Text>
                        </View>
                        <View style={styles.questionPreviewBadgesRow}>
                          <View style={styles.previewTypeBadge}>
                            <Text style={styles.previewTypeBadgeText}>
                              {q.type === 'select' ? (q.selectionMode === 'multiple' ? 'Selección múltiple' : 'Selección única') : q.type === 'number' ? 'Número' : q.type === 'date' ? 'Fecha' : q.type === 'boolean' ? 'Booleano' : 'Texto'}
                            </Text>
                          </View>
                          {q.required ? (
                            <View style={[styles.previewTypeBadge, styles.previewRequiredBadge]}>
                              <Text style={styles.previewRequiredBadgeText}>Obligatoria</Text>
                            </View>
                          ) : null}
                          {q.useAsFilter ? (
                            <View style={[styles.previewTypeBadge, styles.previewFilterBadge]}>
                              <Text style={styles.previewFilterBadgeText}>Filtro</Text>
                            </View>
                          ) : null}
                        </View>
                        {q.placeholder ? (
                          <Text style={styles.previewPlaceholderText}>Ayuda: {q.placeholder}</Text>
                        ) : null}
                        {q.options && q.options.length ? (
                          <View style={styles.previewOptionsSection}>
                            <Text style={styles.previewOptionsTitle}>Opciones:</Text>
                            {q.options.map((opt, oIdx) => (
                              <Text key={opt.value || `opt_${oIdx}`} style={styles.previewOptionText}>
                                • {opt.label || opt.value}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.previewEmptyText}>No hay preguntas configuradas en este formulario.</Text>
                  )}
                </View>
              ) : null}

              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                  <Text style={styles.link}>{isExpanded ? 'Ocultar preguntas' : `Ver preguntas (${questionCount})`}</Text>
                </TouchableOpacity>
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

                  {question.kind === 'number' ? (
                    <View style={sharedFormStyles.switchRow}>
                      <Text style={styles.switchLabel}>Es superficie base del predio (para balance)</Text>
                      <Switch
                        value={Boolean(question.isBaseSurface)}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            preguntas: updateQuestion(current.preguntas, index, (item) => ({ ...item, isBaseSurface: value })),
                          }))
                        }
                      />
                    </View>
                  ) : null}

                  {index > 0 ? (
                    <View style={styles.dependencyCard}>
                      <View style={sharedFormStyles.switchRow}>
                        <Text style={styles.switchLabel}>Pregunta condicional (depende de otra)</Text>
                        <Switch
                          value={Boolean(question.hasDependency)}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              preguntas: updateQuestion(current.preguntas, index, (item) => ({
                                ...item,
                                hasDependency: value,
                                dependsOnQuestionId: value ? (item.dependsOnQuestionId || form.preguntas[index - 1]?.id || '') : '',
                                dependsOnValue: value ? (item.dependsOnValue || 'no') : '',
                              })),
                            }))
                          }
                        />
                      </View>

                      {question.hasDependency ? (
                        <View style={styles.dependencyBody}>
                          <Text style={styles.dependencyTitle}>Mostrar esta pregunta solo cuando:</Text>
                          <Text style={styles.fieldSubLabel}>Pregunta anterior:</Text>
                          <View style={styles.parentPillsWrapper}>
                            {form.preguntas.slice(0, index).map((parentQ, pIdx) => {
                              const isSelected = (question.dependsOnQuestionId || form.preguntas[index - 1]?.id) === parentQ.id;
                              return (
                                <TouchableOpacity
                                  key={parentQ.id}
                                  style={[styles.parentPill, isSelected && styles.parentPillActive]}
                                  onPress={() =>
                                    setForm((current) => ({
                                      ...current,
                                      preguntas: updateQuestion(current.preguntas, index, (item) => ({
                                        ...item,
                                        dependsOnQuestionId: parentQ.id,
                                      })),
                                    }))
                                  }
                                >
                                  <Text style={[styles.parentPillText, isSelected && styles.parentPillTextActive]}>
                                    P{pIdx + 1}: {parentQ.label ? parentQ.label.slice(0, 24) : `Pregunta ${pIdx + 1}`}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <Text style={[styles.fieldSubLabel, { marginTop: 6 }]}>Valor de respuesta requerido:</Text>
                          <TextInput
                            value={question.dependsOnValue}
                            onChangeText={(value) =>
                              setForm((current) => ({
                                ...current,
                                preguntas: updateQuestion(current.preguntas, index, (item) => ({
                                  ...item,
                                  dependsOnValue: value,
                                })),
                              }))
                            }
                            style={[sharedFormStyles.input, { paddingVertical: 6 }]}
                            placeholder="Ej: no, si, Sí"
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {question.kind === 'carga_familiar' ? (
                    <View style={styles.cargaFamiliarAdminBox}>
                      <Text style={styles.cargaFamiliarAdminTitle}>👥 Estructura de Carga Familiar</Text>
                      <Text style={styles.cargaFamiliarAdminSubtitle}>
                        El encuestador registrará féminas y masculinos en los 5 grupos etarios oficiales:
                      </Text>
                      <View style={styles.cargaFamiliarAdminList}>
                        <Text style={styles.cargaFamiliarAdminItem}>• <Text style={{ fontWeight: '700' }}>Adulto Mayor:</Text> Féminas ≥ 55 años y Masculinos ≥ 60 años</Text>
                        <Text style={styles.cargaFamiliarAdminItem}>• <Text style={{ fontWeight: '700' }}>Adulto:</Text> Féminas de 18 a 54 años y Masculinos de 18 a 59 años</Text>
                        <Text style={styles.cargaFamiliarAdminItem}>• <Text style={{ fontWeight: '700' }}>Adolescente:</Text> Féminas y Masculinos de 12 a 17 años</Text>
                        <Text style={styles.cargaFamiliarAdminItem}>• <Text style={{ fontWeight: '700' }}>Menor:</Text> Féminas y Masculinos de 4 a 11 años</Text>
                        <Text style={styles.cargaFamiliarAdminItem}>• <Text style={{ fontWeight: '700' }}>Infante:</Text> Féminas y Masculinos de 0 a 3 años</Text>
                      </View>
                    </View>
                  ) : null}

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
                        <Text style={styles.fieldLabel}>
                          {question.kind === 'rubros_agricolas'
                            ? 'Rubros agrícolas disponibles'
                            : question.kind === 'produccion_animal'
                            ? 'Especies animales disponibles'
                            : question.kind === 'carga_familiar'
                            ? 'Grupos etarios disponibles'
                            : 'Opciones'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {(question.kind === 'rubros_agricolas' || question.kind === 'produccion_animal' || question.kind === 'carga_familiar') ? (
                            <TouchableOpacity
                              onPress={() =>
                                setForm((current) => ({
                                  ...current,
                                  preguntas: updateQuestion(current.preguntas, index, (item) => ({
                                    ...item,
                                    options: getDefaultOptionsForKind(question.kind),
                                  })),
                                }))
                              }
                            >
                              <Text style={styles.resetOptionsText}>Predeterminados</Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity onPress={() => addOption(index)}>
                            <Text style={styles.addOptionText}>+ Agregar</Text>
                          </TouchableOpacity>
                        </View>
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
  dependencyCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  dependencyBody: {
    gap: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    paddingTop: 8,
  },
  dependencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  fieldSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  parentPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  parentPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  parentPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  parentPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  parentPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resetOptionsText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 13,
  },
  questionsPreviewWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  questionsPreviewHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  questionPreviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 6,
  },
  questionPreviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  questionPreviewNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f766e',
  },
  questionPreviewLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  questionPreviewBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTypeBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewTypeBadgeText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '700',
  },
  previewRequiredBadge: {
    backgroundColor: '#fee2e2',
  },
  previewRequiredBadgeText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  previewFilterBadge: {
    backgroundColor: '#fef3c7',
  },
  previewFilterBadgeText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
  },
  previewPlaceholderText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  previewOptionsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 6,
    gap: 2,
  },
  previewOptionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  previewOptionText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 4,
  },
  cargaFamiliarAdminBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cargaFamiliarAdminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  cargaFamiliarAdminSubtitle: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 8,
  },
  cargaFamiliarAdminList: {
    gap: 4,
  },
  cargaFamiliarAdminItem: {
    fontSize: 12,
    color: '#1e293b',
  },
  previewEmptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});