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
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import {
  buildDefaultAnswers,
  clearDraftAnswers,
  enqueueSubmission,
  getFormularioById,
  getDraftAnswers,
  isRetryableSubmissionError,
  parseFormStructure,
  saveDraftAnswers,
  submitAndMarkFormulario,
  validateAnswers,
} from '../../services/encuestadorFormService';

import { showErrorAlert } from '../../utils/humanizerUtils';
import { FormQuestion } from '../../types/formularios';

type DynamicFormRouteParams = {
  campesinoId: string;
  formularioId: string;
  allActiveFormIds: string[];
};

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
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const params = route.params as DynamicFormRouteParams;
  const { token, user } = useAuthStore();
  const [title, setTitle] = useState('Formulario dinámico');
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const formulario = await getFormularioById(token, params.formularioId);
        if (!formulario) {
          showErrorAlert('No se encontró la estructura de este formulario.', 'Formulario no disponible');
          setLoading(false);
          return;
        }

        setTitle(formulario.titulo || 'Formulario dinámico');
        const structure = parseFormStructure(formulario.estructura);
        const questionsList = Array.isArray(structure?.preguntas) ? structure.preguntas : [];
        const initialAnswers = buildDefaultAnswers(questionsList);

        const draftAnswers = await getDraftAnswers(params.campesinoId, params.formularioId).catch(() => null);
        if (draftAnswers && typeof draftAnswers === 'object') {
          setAnswers({ ...initialAnswers, ...draftAnswers });
        } else {
          setAnswers(initialAnswers);
        }

        setQuestions(questionsList);
      } catch (error) {
        showErrorAlert(error, 'No se pudo cargar la información del formulario');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [params.campesinoId, params.formularioId, token]);

  useEffect(() => {
    if (!questions.length) {
      return;
    }

    if (saveDraftTimerRef.current) {
      clearTimeout(saveDraftTimerRef.current);
    }

    saveDraftTimerRef.current = setTimeout(() => {
      saveDraftAnswers(params.campesinoId, params.formularioId, answers).catch(() => undefined);
    }, 300);

    return () => {
      if (saveDraftTimerRef.current) {
        clearTimeout(saveDraftTimerRef.current);
      }
    };
  }, [answers, params.campesinoId, params.formularioId, questions.length]);

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const save = async () => {
    if (!token || saving) {
      return;
    }

    if (!questions.length) {
      showErrorAlert('Este formulario no contiene preguntas configuradas para responder.', 'Formulario sin preguntas');
      return;
    }

    const validationError = validateAnswers(questions, answers);
    if (validationError) {
      showErrorAlert(validationError, 'Por favor verifica la información ingresada', 'Respuestas incompletas');
      return;
    }

    setSaving(true);
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

      await clearDraftAnswers(params.campesinoId, params.formularioId);
      navigation.replace('SubmissionResult', {
        campesinoId: params.campesinoId,
        formularioId: params.formularioId,
        formularioTitulo: title,
        status: 'enviado',
        message: 'Formulario guardado correctamente en el backend.',
      });
    } catch (error) {
      if (isRetryableSubmissionError(error)) {
        await enqueueSubmission({
          campesinoId: params.campesinoId,
          formularioId: params.formularioId,
          formularioTitulo: title,
          respuestas: answers,
          allActiveFormIds: params.allActiveFormIds,
          encuestadorId: user?.id,
          capturedAtIso: new Date().toISOString(),
        });

        await clearDraftAnswers(params.campesinoId, params.formularioId);
        navigation.replace('SubmissionResult', {
          campesinoId: params.campesinoId,
          formularioId: params.formularioId,
          formularioTitulo: title,
          status: 'pendiente_offline',
          message:
            'Se guardó offline y se sincronizará al recuperar conexión o cuando el backend vuelva a estar disponible.',
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'No se pudo guardar el formulario';
      Alert.alert('Error al guardar', message);
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

      {questions.map((question) => (
        <View key={question.id} style={styles.questionCard}>
          <Text style={styles.questionLabel}>
            {question.label} {question.required ? '*' : ''}
          </Text>
          {renderQuestionInput(question, answers[question.id], setAnswer)}
        </View>
      ))}

      <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar formulario'}</Text>
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
  questionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  questionLabel: { fontWeight: '700', color: '#0f172a', marginBottom: 8 },
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
  optionPill: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  optionPillSelected: { backgroundColor: '#1d4ed8' },
  optionText: { color: '#1f2937', fontWeight: '600' },
  optionTextSelected: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: '#334155', fontWeight: '600' },
  saveButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});