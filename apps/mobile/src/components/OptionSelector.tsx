import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type OptionSelectorOption = {
  label: string;
  value: string;
};

export const GENDER_OPTIONS: OptionSelectorOption[] = [
  { label: 'No especificar', value: '' },
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Femenino', value: 'Femenino' },
  { label: 'Otro', value: 'Otro' },
];

interface OptionSelectorProps {
  label: string;
  value: string;
  options: OptionSelectorOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function OptionSelector({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
}: OptionSelectorProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value || 'empty'}
              style={[styles.option, selected && styles.optionActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!value ? <Text style={styles.placeholder}>{placeholder}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 10 },
  label: { color: '#1f2937', fontWeight: '700', marginBottom: 6 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#dfe6f2',
  },
  optionActive: { backgroundColor: '#1d4ed8' },
  optionText: { color: '#1f2937', fontWeight: '600' },
  optionTextActive: { color: '#fff' },
  placeholder: { marginTop: 6, color: '#64748b', fontSize: 12 },
});