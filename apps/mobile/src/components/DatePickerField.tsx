import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DatePickerFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const MONTH_OPTIONS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDateParts(value?: string): DateParts {
  if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (year && month && day) {
      return { year, month, day };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function formatDateParts(parts: DateParts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export default function DatePickerField({ label, value, onChange, onClear }: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const [parts, setParts] = useState<DateParts>(parseDateParts(value));

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = currentYear; year >= 1940; year -= 1) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  const dayOptions = useMemo(() => {
    const limit = daysInMonth(parts.year, parts.month);
    return Array.from({ length: limit }, (_, i) => i + 1);
  }, [parts.year, parts.month]);

  const open = () => {
    setParts(parseDateParts(value));
    setVisible(true);
  };

  const updateYear = (year: number) => {
    setParts((current) => {
      const maxDay = daysInMonth(year, current.month);
      return { ...current, year, day: Math.min(current.day, maxDay) };
    });
  };

  const updateMonth = (month: number) => {
    setParts((current) => {
      const maxDay = daysInMonth(current.year, month);
      return { ...current, month, day: Math.min(current.day, maxDay) };
    });
  };

  const updateDay = (day: number) => setParts((current) => ({ ...current, day }));

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.trigger} onPress={open}>
          <Text style={styles.triggerText}>{value ? value.slice(0, 10) : 'Seleccionar fecha'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            onClear?.();
            onChange('');
          }}
        >
          <Text style={styles.clearText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Calendario</Text>

            <Text style={styles.sectionTitle}>Año</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {yearOptions.map((year) => {
                const selected = year === parts.year;
                return (
                  <TouchableOpacity key={year} style={[styles.chip, selected && styles.chipSelected]} onPress={() => updateYear(year)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{year}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Mes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {MONTH_OPTIONS.map((monthName, index) => {
                const month = index + 1;
                const selected = month === parts.month;
                return (
                  <TouchableOpacity key={monthName} style={[styles.chip, selected && styles.chipSelected]} onPress={() => updateMonth(month)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{monthName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Día</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {dayOptions.map((day) => {
                const selected = day === parts.day;
                return (
                  <TouchableOpacity key={day} style={[styles.chip, selected && styles.chipSelected]} onPress={() => updateDay(day)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{pad2(day)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionSecondary} onPress={() => setVisible(false)}>
                <Text style={styles.actionSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={() => {
                  onChange(formatDateParts(parts));
                  setVisible(false);
                }}
              >
                <Text style={styles.actionPrimaryText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 10 },
  label: { color: '#1f2937', fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trigger: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  triggerText: { color: '#111827' },
  clearButton: { backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  clearText: { color: '#991b1b', fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  sectionTitle: { color: '#1f2937', fontWeight: '700', marginBottom: 5 },
  optionRow: { gap: 8, paddingBottom: 8 },
  chip: { backgroundColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  chipSelected: { backgroundColor: '#1d4ed8' },
  chipText: { color: '#111827', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  actionSecondary: { backgroundColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  actionSecondaryText: { color: '#111827', fontWeight: '700' },
  actionPrimary: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  actionPrimaryText: { color: '#fff', fontWeight: '700' },
});
