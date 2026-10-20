import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  buildDefaultAnswers,
  calcularTotalM2Animales,
  calcularTotalM2Rubros,
  clearDraftAnswers,
  enqueueSubmission,
  getFormularioById,
  getDraftAnswers,
  isQuestionVisible,
  isRetryableSubmissionError,
  parseFormStructure,
  persistFormularioResponseMetadata,
  saveDraftAnswers,
  submitAndMarkFormulario,
  validateAnswers,
  calcularTotalCargaFamiliar,
} from '../../services/encuestadorFormService';

import { showErrorAlert } from '../../utils/humanizerUtils';
import { FormQuestion, ProduccionAnimalItem, RubroAgricolaItem, CargaFamiliarItem, DEFAULT_CARGA_FAMILIAR_GRUPOS } from '../../types/formularios';
import { Theme } from '../../theme/colors';

type RouteParams = {
  campesinoId: string;
  formularioId: string;
  allActiveFormIds: string[];
};

type DynamicFormRouteProp = RouteProp<{ params: RouteParams }, 'params'>;

type RootStackParamList = {
  SubmissionResult: {
    campesinoId: string;
    formularioId: string;
    formularioTitulo: string;
    status: 'enviado' | 'pendiente_offline';
    message: string;
  };
};

export default function DynamicFormScreen() {
  const route = useRoute<DynamicFormRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { token, user } = useAuthStore();
  const params = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Cargando...');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    getFormularioById(token, params.formularioId)
      .then(async (formulario) => {
        if (!formulario) {
          showErrorAlert('No se encontró la estructura de este formulario.', 'Formulario no disponible');
          setQuestions([]);
          return;
        }

        setTitle(formulario.titulo);
        const structure = parseFormStructure(formulario.estructura as Record<string, unknown>);
        const questionsList = Array.isArray(structure?.preguntas) ? structure.preguntas : [];
        setQuestions(questionsList);

        const draft = await getDraftAnswers(params.campesinoId, params.formularioId).catch(() => ({}));
        const hasDraft = draft && Object.keys(draft).length > 0;
        if (hasDraft) {
          const validQuestionIds = new Set(questionsList.map((q) => q.id));
          const cleanDraft: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(draft)) {
            if (validQuestionIds.has(k)) {
              cleanDraft[k] = v;
            }
          }
          const defaultAnswers = buildDefaultAnswers(questionsList);
          setAnswers({ ...defaultAnswers, ...cleanDraft });
        } else {
          setAnswers(buildDefaultAnswers(questionsList));
        }
      })
      .catch(() => {
        showErrorAlert('Ocurrió un inconveniente al cargar el formulario.', 'Error de carga');
        setQuestions([]);
      })
      .finally(() => setLoading(false));
  }, [token, params.campesinoId, params.formularioId]);

  useEffect(() => {
    if (!questions.length) return;

    if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);

    saveDraftTimerRef.current = setTimeout(() => {
      saveDraftAnswers(params.campesinoId, params.formularioId, answers).catch(() => undefined);
    }, 1000);

    return () => {
      if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
    };
  }, [answers, params.campesinoId, params.formularioId, questions.length]);

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Cálculo reactivo de métricas de superficie del predio
  const baseSurfaceQuestion = useMemo(
    () =>
      questions.find(
        (q) => q.isBaseSurface || (q.type === 'number' && /superficie.*(predio|total)/i.test(q.label)),
      ),
    [questions],
  );

  const superficiePredio = useMemo(
    () => (baseSurfaceQuestion ? Number(answers[baseSurfaceQuestion.id]) || 0 : 0),
    [baseSurfaceQuestion, answers],
  );

  const hasAgropecuarioQuestions = useMemo(
    () => questions.some((q) => q.type === 'rubros_agricolas' || q.type === 'produccion_animal'),
    [questions],
  );

  const totalM2Rubros = useMemo(() => {
    let sum = 0;
    questions.forEach((q) => {
      if (q.type === 'rubros_agricolas') {
        sum += calcularTotalM2Rubros(answers[q.id]);
      }
    });
    return sum;
  }, [questions, answers]);

  const totalM2Animales = useMemo(() => {
    let sum = 0;
    questions.forEach((q) => {
      if (q.type === 'produccion_animal') {
        sum += calcularTotalM2Animales(answers[q.id]);
      }
    });
    return sum;
  }, [questions, answers]);

  const totalM2Ocupado = totalM2Rubros + totalM2Animales;
  const superficieRestante = superficiePredio - totalM2Ocupado;
  const isSuperficieExcedida = superficiePredio > 0 && totalM2Ocupado > superficiePredio;
  const pctOcupado =
    superficiePredio > 0
      ? Math.min(100, Math.round((totalM2Ocupado / superficiePredio) * 100))
      : 0;

  // Filtrado de preguntas visibles respetando depends_on
  const visibleQuestions = useMemo(
    () => questions.filter((q) => isQuestionVisible(q, answers)),
    [questions, answers],
  );

  const save = async () => {
    if (!token || saving) return;

    if (!questions.length) {
      showErrorAlert('Este formulario no contiene preguntas configuradas para responder.', 'Formulario sin preguntas');
      return;
    }

    if (isSuperficieExcedida) {
      showErrorAlert(
        `La superficie ocupada (${totalM2Ocupado} m²) supera la superficie del predio (${superficiePredio} m²) por ${totalM2Ocupado - superficiePredio} m². Por favor ajusta los valores antes de guardar.`,
        'Superficie excedida',
      );
      return;
    }

    const validationError = validateAnswers(questions, answers);
    if (validationError) {
      showErrorAlert(validationError, 'Por favor verifica la información ingresada', 'Respuestas incompletas');
      return;
    }

    setSaving(true);

    try {
      await persistFormularioResponseMetadata(params.campesinoId, params.formularioId);
    } catch {
      // Non-fatal
    }

    try {
      await submitAndMarkFormulario(
        token,
        {
          campesino_id: params.campesinoId,
          encuestador_id: user?.id,
          respuestas: answers,
          metadata: { origen: 'mobile-app', queued: false },
          capturado_en: new Date().toISOString(),
        },
        params.campesinoId,
        params.formularioId,
        params.allActiveFormIds,
        title,
      );

      await clearDraftAnswers(params.campesinoId, params.formularioId).catch(() => undefined);

      navigation.replace('SubmissionResult', {
        campesinoId: params.campesinoId,
        formularioId: params.formularioId,
        formularioTitulo: title,
        status: 'enviado',
        message: 'Formulario guardado correctamente.',
      });
    } catch {
      await enqueueSubmission({
        campesinoId: params.campesinoId,
        formularioId: params.formularioId,
        formularioTitulo: title,
        respuestas: answers,
        allActiveFormIds: params.allActiveFormIds,
        encuestadorId: user?.id,
        capturedAtIso: new Date().toISOString(),
      }).catch(() => undefined);

      await clearDraftAnswers(params.campesinoId, params.formularioId).catch(() => undefined);

      navigation.replace('SubmissionResult', {
        campesinoId: params.campesinoId,
        formularioId: params.formularioId,
        formularioTitulo: title,
        status: 'pendiente_offline',
        message: 'Guardado localmente. Se sincronizará automáticamente con el servidor.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text style={sharedScreenStyles.helperText}>Cargando formulario...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={sharedScreenStyles.surfaceSoft} contentContainerStyle={sharedScreenStyles.contentMd}>
      <Text style={sharedScreenStyles.cardTitleXl}>{title}</Text>
      <Text style={styles.subtitle}>Completa todos los campos requeridos antes de guardar.</Text>

      {/* Widget interactivo de Balance de Superficie */}
      {hasAgropecuarioQuestions ? (
        <View style={[styles.balanceCard, isSuperficieExcedida && styles.balanceCardExceeded]}>
          <View style={styles.balanceHeader}>
            <MaterialCommunityIcons
              name={isSuperficieExcedida ? 'alert-circle' : 'chart-pie'}
              size={20}
              color={isSuperficieExcedida ? '#dc2626' : Theme.colors.greenDark}
            />
            <Text style={[styles.balanceTitle, isSuperficieExcedida && { color: '#dc2626' }]}>
              Balance de Superficie del Predio
            </Text>
          </View>

          <View style={styles.balanceGrid}>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Superficie Predio</Text>
              <Text style={styles.balanceMetricValue}>
                {superficiePredio > 0 ? `${superficiePredio} m²` : 'Sin definir'}
              </Text>
            </View>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Rubros Cultivos</Text>
              <Text style={styles.balanceMetricValue}>{totalM2Rubros} m²</Text>
            </View>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Espacio Animal</Text>
              <Text style={styles.balanceMetricValue}>{totalM2Animales} m²</Text>
            </View>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Superficie Libre</Text>
              <Text
                style={[
                  styles.balanceMetricValue,
                  { color: isSuperficieExcedida ? '#dc2626' : '#15803d' },
                ]}
              >
                {superficieRestante} m²
              </Text>
            </View>
          </View>

          {/* Barra de progreso */}
          {superficiePredio > 0 ? (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${pctOcupado}%`,
                    backgroundColor: isSuperficieExcedida ? '#dc2626' : '#16a34a',
                  },
                ]}
              />
            </View>
          ) : (
            <Text style={styles.balanceHint}>
              💡 Ingresa la superficie total del predio arriba para calcular el área libre en vivo.
            </Text>
          )}

          {isSuperficieExcedida ? (
            <View style={styles.exceededAlertBox}>
              <Text style={styles.exceededAlertText}>
                ⚠️ ¡Superficie excedida por {totalM2Ocupado - superficiePredio} m²! El espacio ocupado ({totalM2Ocupado} m²) supera el total del predio ({superficiePredio} m²).
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Renderizado de preguntas visibles */}
      {visibleQuestions.map((question) => (
        <View key={question.id} style={styles.questionCard}>
          <Text style={styles.questionLabel}>
            {question.label} {question.required ? '*' : ''}
          </Text>
          {renderQuestionInput(question, answers[question.id], setAnswer)}
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.saveButton,
          (saving || isSuperficieExcedida) && styles.saveButtonDisabled,
          isSuperficieExcedida && { backgroundColor: '#ef4444' },
        ]}
        onPress={save}
        disabled={saving || isSuperficieExcedida}
      >
        <Text style={styles.saveButtonText}>
          {saving
            ? 'Guardando...'
            : isSuperficieExcedida
            ? 'Corrige el exceso de superficie'
            : 'Guardar formulario'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function renderQuestionInput(
  question: FormQuestion,
  value: unknown,
  setAnswer: (questionId: string, newValue: unknown) => void,
): React.ReactNode {
  if (question.type === 'boolean') {
    return (
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{value === true ? 'Sí' : 'No'}</Text>
        <Switch value={value === true} onValueChange={(newValue) => setAnswer(question.id, newValue)} />
      </View>
    );
  }

  if (question.type === 'rubros_agricolas') {
    const currentList: RubroAgricolaItem[] = Array.isArray(value) ? (value as RubroAgricolaItem[]) : [];
    const activeRubroMap = new Map<string, number>();
    currentList.forEach((item) => {
      if (item && item.rubro) {
        activeRubroMap.set(item.rubro, Number(item.superficie_m2) || 0);
      }
    });

    const toggleRubro = (rubroName: string) => {
      if (activeRubroMap.has(rubroName)) {
        const next = currentList.filter((item) => item.rubro !== rubroName);
        setAnswer(question.id, next);
      } else {
        const next = [...currentList, { rubro: rubroName, superficie_m2: 0 }];
        setAnswer(question.id, next);
      }
    };

    const updateRubroM2 = (rubroName: string, text: string) => {
      const val = Number(text.replace(/[^0-9.]/g, '')) || 0;
      const next = currentList.map((item) =>
        item.rubro === rubroName ? { ...item, superficie_m2: val } : item,
      );
      setAnswer(question.id, next);
    };

    const optionsList =
      question.options && question.options.length
        ? question.options
        : [
            { label: 'Café', value: 'Café' },
            { label: 'Musáceas', value: 'Musáceas' },
            { label: 'Maíz', value: 'Maíz' },
            { label: 'Yuca', value: 'Yuca' },
            { label: 'Cacao', value: 'Cacao' },
          ];

    const currentSubtotalM2 = currentList.reduce(
      (sum, item) => sum + (Number(item.superficie_m2) || 0),
      0,
    );

    return (
      <View style={styles.agroContainer}>
        <Text style={styles.agroHelpText}>Selecciona los rubros sembrados e ingresa los m² de cada uno:</Text>

        {/* Selector de rubros en pills */}
        <View style={styles.optionsContainer}>
          {optionsList.map((opt) => {
            const rubroKey = opt.value || opt.label;
            const isSelected = activeRubroMap.has(rubroKey);
            return (
              <TouchableOpacity
                key={rubroKey}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => toggleRubro(rubroKey)}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {isSelected ? '✓ ' : '+ '}
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tarjetas de m² por cada rubro activo */}
        {currentList.length > 0 ? (
          <View style={styles.activeItemsList}>
            {currentList.map((item) => (
              <View key={item.rubro} style={styles.activeItemCard}>
                <View style={styles.activeItemHeader}>
                  <Text style={styles.activeItemTitle}>🌱 {item.rubro}</Text>
                  <TouchableOpacity onPress={() => toggleRubro(item.rubro)}>
                    <Text style={styles.activeItemRemove}>Quitar</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.m2InputRow}>
                  <Text style={styles.m2InputLabel}>Superficie sembrada (m²):</Text>
                  <TextInput
                    style={styles.m2Input}
                    keyboardType="numeric"
                    value={item.superficie_m2 ? String(item.superficie_m2) : ''}
                    placeholder="0"
                    onChangeText={(text) => updateRubroM2(item.rubro, text)}
                  />
                </View>
              </View>
            ))}

            <View style={styles.subtotalBanner}>
              <Text style={styles.subtotalText}>
                Total superficie en rubros: <Text style={{ fontWeight: '800' }}>{currentSubtotalM2} m²</Text>
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  if (question.type === 'produccion_animal') {
    const currentList: ProduccionAnimalItem[] = Array.isArray(value) ? (value as ProduccionAnimalItem[]) : [];
    const activeEspecieMap = new Map<string, ProduccionAnimalItem>();
    currentList.forEach((item) => {
      if (item && item.especie) {
        activeEspecieMap.set(item.especie, item);
      }
    });

    const toggleEspecie = (especieName: string) => {
      if (activeEspecieMap.has(especieName)) {
        const next = currentList.filter((item) => item.especie !== especieName);
        setAnswer(question.id, next);
      } else {
        const next = [
          ...currentList,
          { especie: especieName, hembras: 0, machos: 0, crias: 0, espacio_productivo_m2: 0 },
        ];
        setAnswer(question.id, next);
      }
    };

    const updateField = (especieName: string, field: keyof ProduccionAnimalItem, text: string) => {
      const val = Number(text.replace(/[^0-9.]/g, '')) || 0;
      const next = currentList.map((item) =>
        item.especie === especieName ? { ...item, [field]: val } : item,
      );
      setAnswer(question.id, next);
    };

    const optionsList =
      question.options && question.options.length
        ? question.options
        : [
            { label: 'Bovino', value: 'Bovino' },
            { label: 'Porcino', value: 'Porcino' },
            { label: 'Caprino', value: 'Caprino' },
            { label: 'Ovino', value: 'Ovino' },
            { label: 'Aves', value: 'Aves' },
          ];

    const currentSubtotalM2 = currentList.reduce(
      (sum, item) => sum + (Number(item.espacio_productivo_m2) || 0),
      0,
    );
    const currentTotalAnimales = currentList.reduce(
      (sum, item) =>
        sum + (Number(item.hembras) || 0) + (Number(item.machos) || 0) + (Number(item.crias) || 0),
      0,
    );

    return (
      <View style={styles.agroContainer}>
        <Text style={styles.agroHelpText}>Selecciona las especies criadas e ingresa cantidad y espacio ocupado:</Text>

        {/* Pills de selección de especies */}
        <View style={styles.optionsContainer}>
          {optionsList.map((opt) => {
            const especieKey = opt.value || opt.label;
            const isSelected = activeEspecieMap.has(especieKey);
            return (
              <TouchableOpacity
                key={especieKey}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => toggleEspecie(especieKey)}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {isSelected ? '✓ ' : '+ '}
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tarjetas de detalle por especie activa */}
        {currentList.length > 0 ? (
          <View style={styles.activeItemsList}>
            {currentList.map((item) => (
              <View key={item.especie} style={styles.activeItemCard}>
                <View style={styles.activeItemHeader}>
                  <Text style={styles.activeItemTitle}>🐄 {item.especie}</Text>
                  <TouchableOpacity onPress={() => toggleEspecie(item.especie)}>
                    <Text style={styles.activeItemRemove}>Quitar</Text>
                  </TouchableOpacity>
                </View>

                {/* 3 Inputs Grid: Hembras, Machos, Crías */}
                <View style={styles.animalGrid}>
                  <View style={styles.animalCol}>
                    <Text style={styles.animalFieldLabel}>Hembras:</Text>
                    <TextInput
                      style={styles.animalInput}
                      keyboardType="numeric"
                      value={item.hembras ? String(item.hembras) : ''}
                      placeholder="0"
                      onChangeText={(t) => updateField(item.especie, 'hembras', t)}
                    />
                  </View>
                  <View style={styles.animalCol}>
                    <Text style={styles.animalFieldLabel}>Machos:</Text>
                    <TextInput
                      style={styles.animalInput}
                      keyboardType="numeric"
                      value={item.machos ? String(item.machos) : ''}
                      placeholder="0"
                      onChangeText={(t) => updateField(item.especie, 'machos', t)}
                    />
                  </View>
                  <View style={styles.animalCol}>
                    <Text style={styles.animalFieldLabel}>Crías:</Text>
                    <TextInput
                      style={styles.animalInput}
                      keyboardType="numeric"
                      value={item.crias ? String(item.crias) : ''}
                      placeholder="0"
                      onChangeText={(t) => updateField(item.especie, 'crias', t)}
                    />
                  </View>
                </View>

                <View style={[styles.m2InputRow, { marginTop: 8 }]}>
                  <Text style={styles.m2InputLabel}>Espacio productivo (m²):</Text>
                  <TextInput
                    style={styles.m2Input}
                    keyboardType="numeric"
                    value={item.espacio_productivo_m2 ? String(item.espacio_productivo_m2) : ''}
                    placeholder="0"
                    onChangeText={(t) => updateField(item.especie, 'espacio_productivo_m2', t)}
                  />
                </View>
              </View>
            ))}

            <View style={styles.subtotalBanner}>
              <Text style={styles.subtotalText}>
                Total animales: <Text style={{ fontWeight: '800' }}>{currentTotalAnimales}</Text> | Espacio productivo:{' '}
                <Text style={{ fontWeight: '800' }}>{currentSubtotalM2} m²</Text>
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  if (question.type === 'carga_familiar') {
    const rawList: CargaFamiliarItem[] = Array.isArray(value) ? (value as CargaFamiliarItem[]) : [];

    const currentList: CargaFamiliarItem[] = DEFAULT_CARGA_FAMILIAR_GRUPOS.map((defGroup) => {
      const existing = rawList.find(
        (item) => item && (item.grupo === defGroup.grupo || item.label === defGroup.label),
      );
      return {
        grupo: defGroup.grupo,
        label: defGroup.label,
        rango_edad: defGroup.rango_edad,
        femenino: existing ? Number(existing.femenino) || 0 : 0,
        masculino: existing ? Number(existing.masculino) || 0 : 0,
      };
    });

    const updateGroupGender = (grupoKey: string, gender: 'femenino' | 'masculino', text: string) => {
      const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
      const next = currentList.map((item) =>
        item.grupo === grupoKey ? { ...item, [gender]: Math.max(0, val) } : item,
      );
      setAnswer(question.id, next);
    };

    const adjustGroupGender = (grupoKey: string, gender: 'femenino' | 'masculino', delta: number) => {
      const next = currentList.map((item) => {
        if (item.grupo === grupoKey) {
          const currentVal = Number(item[gender]) || 0;
          return { ...item, [gender]: Math.max(0, currentVal + delta) };
        }
        return item;
      });
      setAnswer(question.id, next);
    };

    const { totalFemenino, totalMasculino, totalPersonas } = calcularTotalCargaFamiliar(currentList);

    return (
      <View style={styles.cargaFamiliarContainer}>
        <Text style={styles.agroHelpText}>
          Ingresa la cantidad de personas por grupo etario y género:
        </Text>

        <View style={styles.cargaFamiliarList}>
          {currentList.map((item) => {
            const subtotalGrupo = (Number(item.femenino) || 0) + (Number(item.masculino) || 0);
            return (
              <View key={item.grupo} style={styles.cargaFamiliarCard}>
                <View style={styles.cargaFamiliarCardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.cargaFamiliarGroupTitle}>{item.label}</Text>
                    <Text style={styles.cargaFamiliarRangeText}>{item.rango_edad}</Text>
                  </View>
                  <View style={styles.cargaFamiliarSubtotalBadge}>
                    <Text style={styles.cargaFamiliarSubtotalText}>
                      Subtotal: {subtotalGrupo}
                    </Text>
                  </View>
                </View>

                <View style={styles.cargaFamiliarInputsRow}>
                  {/* Femenino */}
                  <View style={styles.genderInputBox}>
                    <View style={styles.genderHeaderRow}>
                      <Text style={[styles.genderLabel, { color: '#be185d' }]}>♀️ Femenino</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustGroupGender(item.grupo, 'femenino', -1)}
                      >
                        <Text style={styles.stepperBtnText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.genderInput}
                        keyboardType="numeric"
                        value={item.femenino > 0 ? String(item.femenino) : '0'}
                        onChangeText={(t) => updateGroupGender(item.grupo, 'femenino', t)}
                      />
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustGroupGender(item.grupo, 'femenino', 1)}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Masculino */}
                  <View style={styles.genderInputBox}>
                    <View style={styles.genderHeaderRow}>
                      <Text style={[styles.genderLabel, { color: '#1d4ed8' }]}>♂️ Masculino</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustGroupGender(item.grupo, 'masculino', -1)}
                      >
                        <Text style={styles.stepperBtnText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.genderInput}
                        keyboardType="numeric"
                        value={item.masculino > 0 ? String(item.masculino) : '0'}
                        onChangeText={(t) => updateGroupGender(item.grupo, 'masculino', t)}
                      />
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => adjustGroupGender(item.grupo, 'masculino', 1)}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Total Summary Banner */}
        <View style={styles.cargaFamiliarTotalBanner}>
          <Text style={styles.cargaFamiliarTotalTitle}>
            👥 Total Carga Familiar: <Text style={{ fontWeight: '900', color: '#166534' }}>{totalPersonas} personas</Text>
          </Text>
          <Text style={styles.cargaFamiliarTotalSubtitle}>
            (♀️ {totalFemenino} Femeninas &nbsp;|&nbsp; ♂️ {totalMasculino} Masculinos)
          </Text>
        </View>
      </View>
    );
  }

  if (question.type === 'select') {
    const selectedValues = Array.isArray(value) ? value.map((item) => String(item)) : [];
    const isMultiple = question.selectionMode === 'multiple';

    return (
      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const isSelected = isMultiple
            ? selectedValues.includes(option.value)
            : String(value ?? '') === option.value;

          const toggleValue = () => {
            if (!isMultiple) {
              setAnswer(question.id, option.value);
              return;
            }

            const nextValues = isSelected
              ? selectedValues.filter((item) => item !== option.value)
              : [...selectedValues, option.value];
            setAnswer(question.id, nextValues);
          };

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionPill, isSelected && styles.optionPillSelected]}
              onPress={toggleValue}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <TextInput
      style={[styles.input, question.type === 'textarea' && styles.textArea]}
      value={String(value ?? '')}
      onChangeText={(text) => setAnswer(question.id, question.type === 'number' ? Number(text) || '' : text)}
      placeholder={question.placeholder || 'Escribe tu respuesta'}
      keyboardType={question.type === 'number' ? 'numeric' : 'default'}
      multiline={question.type === 'textarea'}
      numberOfLines={question.type === 'textarea' ? 4 : 1}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  subtitle: { color: '#4b5563', marginBottom: 8 },
  questionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12 },
  questionLabel: { fontWeight: '700', color: '#0f172a', marginBottom: 8, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  optionPillSelected: { backgroundColor: '#1d4ed8' },
  optionText: { color: '#1f2937', fontWeight: '600', fontSize: 13 },
  optionTextSelected: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: '#334155', fontWeight: '600' },

  // Balance Card Styles
  balanceCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  balanceCardExceeded: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  balanceMetric: {
    alignItems: 'center',
    flex: 1,
  },
  balanceMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  balanceMetricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  balanceHint: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  exceededAlertBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  exceededAlertText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Agro & Animal Styles
  cargaFamiliarContainer: {
    marginTop: 4,
  },
  cargaFamiliarList: {
    gap: 10,
    marginTop: 8,
  },
  cargaFamiliarCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cargaFamiliarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cargaFamiliarGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  cargaFamiliarRangeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  cargaFamiliarSubtotalBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cargaFamiliarSubtotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  cargaFamiliarInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderInputBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  genderHeaderRow: {
    marginBottom: 6,
    alignItems: 'center',
  },
  genderLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    backgroundColor: '#f1f5f9',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 20,
  },
  genderInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  cargaFamiliarTotalBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  cargaFamiliarTotalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532d',
  },
  cargaFamiliarTotalSubtitle: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 3,
    fontWeight: '600',
  },
  agroContainer: {
    gap: 10,
  },
  agroHelpText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  activeItemsList: {
    gap: 8,
    marginTop: 6,
  },
  activeItemCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  activeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  activeItemRemove: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  m2InputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  m2InputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  m2Input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    width: 110,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  animalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  animalCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  animalFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  animalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtotalBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  subtotalText: {
    fontSize: 12,
    color: '#065f46',
  },

  saveButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});