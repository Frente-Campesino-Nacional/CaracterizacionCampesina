import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type LookupSelectOption = {
  label: string;
  value: string;
  description?: string;
};

interface LookupSelectFieldProps {
  label: string;
  value: string;
  options: LookupSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}

export default function LookupSelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  searchPlaceholder = 'Buscar...',
  allowClear = false,
  clearLabel = 'Sin seleccionar',
}: LookupSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(query);
      const descriptionMatch = option.description?.toLowerCase().includes(query) ?? false;
      const valueMatch = option.value.toLowerCase().includes(query);
      return labelMatch || descriptionMatch || valueMatch;
    });
  }, [options, search]);

  const selectedLabel = value
    ? options.find((option) => option.value === value)?.label || value
    : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={[styles.buttonText, !value && styles.placeholderText]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#334155" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              autoCapitalize="none"
            />

            {allowClear ? (
              <TouchableOpacity style={styles.clearButton} onPress={() => handleSelect('')}>
                <Text style={styles.clearButtonText}>{clearLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value || item.label}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{item.label}</Text>
                    {item.description ? (
                      <Text style={[styles.optionDescription, selected && styles.optionLabelSelected]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron opciones</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 10 },
  label: { color: '#1f2937', fontWeight: '700', marginBottom: 6 },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  buttonText: { color: '#111827', flex: 1, fontWeight: '600' },
  placeholderText: { color: '#64748b' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, maxHeight: '85%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeText: { color: '#0f766e', fontWeight: '700' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  clearButtonText: { color: '#334155', fontWeight: '700' },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionSelected: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  optionLabel: { color: '#0f172a', fontWeight: '700' },
  optionLabelSelected: { color: '#1d4ed8' },
  optionDescription: { color: '#64748b', marginTop: 2, fontSize: 12 },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 24 },
});