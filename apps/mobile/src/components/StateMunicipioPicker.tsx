import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { venezuelaStates } from '../data/venezuelaStates';

interface StateMunicipioPickerProps {
  estado: string;
  municipio: string;
  onEstadoChange: (estado: string) => void;
  onMunicipioChange: (municipio: string) => void;
  labelEstado?: string;
  labelMunicipio?: string;
}

export default function StateMunicipioPicker({
  estado,
  municipio,
  onEstadoChange,
  onMunicipioChange,
  labelEstado = 'Estado',
  labelMunicipio = 'Municipio',
}: StateMunicipioPickerProps) {
  const [visible, setVisible] = useState(false);

  const selectedState = useMemo(
    () => venezuelaStates.find((item) => item.estado === estado),
    [estado],
  );

  const municipioOptions = selectedState?.municipios || [];

  const open = () => {
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
  };

  const handleEstadoSelect = (value: string) => {
    onEstadoChange(value);
    const state = venezuelaStates.find((item) => item.estado === value);
    if (state && !state.municipios.includes(municipio)) {
      onMunicipioChange('');
    }
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{labelEstado}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={open}>
        <Text style={styles.pickerText}>{estado || `Seleccionar ${labelEstado.toLowerCase()}`}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{labelMunicipio}</Text>
      <TouchableOpacity style={[styles.pickerButton, !estado && styles.disabledPicker]} onPress={open} disabled={!estado}>
        <Text style={styles.pickerText}>{municipio || (estado ? `Seleccionar ${labelMunicipio.toLowerCase()}` : 'Selecciona un estado primero')}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Selecciona estado o municipio</Text>
            <Text style={styles.sectionTitle}>Estados</Text>
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {venezuelaStates.map((item) => {
                const selected = item.estado === estado;
                return (
                  <TouchableOpacity
                    key={item.estado}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleEstadoSelect(item.estado)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.estado}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.sectionTitle}>Municipios</Text>
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {municipioOptions.length > 0 ? (
                municipioOptions.map((item) => {
                  const selected = item === municipio;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => {
                        onMunicipioChange(item);
                        close();
                      }}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Selecciona primero un estado</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={close}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 10 },
  label: { color: '#1f2937', fontWeight: '700', marginBottom: 6 },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  disabledPicker: { backgroundColor: '#f8fafc' },
  pickerText: { color: '#111827' },
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  sectionTitle: { color: '#1f2937', fontWeight: '700', marginBottom: 8, marginTop: 10 },
  optionsList: { maxHeight: 150, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 10, backgroundColor: '#f8fafc' },
  optionsContent: { padding: 10, gap: 8 },
  option: { padding: 10, borderRadius: 10, backgroundColor: '#e5e7eb' },
  optionSelected: { backgroundColor: '#1d4ed8' },
  optionText: { color: '#111827' },
  optionTextSelected: { color: '#fff' },
  emptyText: { color: '#64748b', padding: 10 },
  closeButton: { marginTop: 8, alignSelf: 'flex-end', backgroundColor: '#0f766e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  closeButtonText: { color: '#fff', fontWeight: '700' },
});
