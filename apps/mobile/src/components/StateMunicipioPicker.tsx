import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUbicacionCatalogos, UbicacionEstadoRecord } from '../services/adminService';
import { LOCATION_CATALOG_FALLBACK } from '../constants/locationCatalogFallback';

interface StateMunicipioPickerProps {
  estado: string;
  municipio: string;
  parroquia: string;
  onEstadoChange: (estado: string) => void;
  onMunicipioChange: (municipio: string) => void;
  onParroquiaChange: (parroquia: string) => void;
  onSelectionChange?: (selection: {
    estadoId: number | null;
    estadoNombre: string;
    municipioId: number | null;
    municipioNombre: string;
    parroquiaId: number | null;
    parroquiaNombre: string;
  }) => void;
  labelEstado?: string;
  labelMunicipio?: string;
  labelParroquia?: string;
}

export default function StateMunicipioPicker({
  estado,
  municipio,
  parroquia,
  onEstadoChange,
  onMunicipioChange,
  onParroquiaChange,
  onSelectionChange,
  labelEstado = 'Estado',
  labelMunicipio = 'Municipio',
  labelParroquia = 'Parroquia',
}: StateMunicipioPickerProps) {
  const [visible, setVisible] = useState(false);
  const [estados, setEstados] = useState<UbicacionEstadoRecord[]>(LOCATION_CATALOG_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCatalogs = async () => {
      try {
        const cachedRaw = await AsyncStorage.getItem('ubicacion-catalogos-cache-v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0 && active) {
            setEstados(cached);
          }
        }
      } catch {
        // Ignore cache error
      }

      try {
        const response = await getUbicacionCatalogos();
        if (active && response.estados && response.estados.length > 0) {
          setEstados(response.estados);
          await AsyncStorage.setItem('ubicacion-catalogos-cache-v1', JSON.stringify(response.estados)).catch(() => undefined);
        }
      } catch {
        // Quietly maintain local fallback when offline
      }
    };

    loadCatalogs();

    return () => {
      active = false;
    };
  }, []);



  const selectedState = useMemo(
    () => estados.find((item) => item.nombre.toLowerCase() === (estado || '').toLowerCase() || String(item.id) === String(estado)) || estados[0],
    [estado, estados],
  );

  const municipioOptions = useMemo(
    () => (selectedState?.municipios && selectedState.municipios.length > 0) ? selectedState.municipios : estados.flatMap((e) => e.municipios),
    [selectedState, estados],
  );

  const selectedMunicipio = useMemo(
    () => municipioOptions.find((item) => item.nombre.toLowerCase() === (municipio || '').toLowerCase() || String(item.id) === String(municipio)),
    [municipio, municipioOptions],
  );

  const parroquiaOptions = useMemo(() => {
    if (selectedMunicipio && selectedMunicipio.parroquias && selectedMunicipio.parroquias.length > 0) {
      return selectedMunicipio.parroquias;
    }
    return municipioOptions.flatMap((m) => m.parroquias || []);
  }, [selectedMunicipio, municipioOptions]);

  const selectedParroquia = useMemo(
    () => parroquiaOptions.find((item) => item.nombre.toLowerCase() === (parroquia || '').toLowerCase() || String(item.id) === String(parroquia)),
    [parroquia, parroquiaOptions],
  );
  const lastEmittedSelection = useRef('');

  useEffect(() => {
    const selectionKey = [
      selectedState?.id ?? '',
      estado,
      selectedMunicipio?.id ?? '',
      municipio,
      selectedParroquia?.id ?? '',
      parroquia,
    ].join('|');

    if (lastEmittedSelection.current === selectionKey) {
      return;
    }

    lastEmittedSelection.current = selectionKey;

    onSelectionChange?.({
      estadoId: selectedState?.id ?? null,
      estadoNombre: estado,
      municipioId: selectedMunicipio?.id ?? null,
      municipioNombre: municipio,
      parroquiaId: selectedParroquia?.id ?? null,
      parroquiaNombre: parroquia,
    });
  }, [estado, municipio, parroquia, selectedParroquia?.id, selectedMunicipio?.id, selectedState?.id]);

  const open = () => {
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
    setLoading(false);
  };

  const handleEstadoSelect = (value: string) => {
    onEstadoChange(value);
    const state = estados.find((item) => item.nombre === value);
    onMunicipioChange('');
    onParroquiaChange('');
    onSelectionChange?.({
      estadoId: state?.id ?? null,
      estadoNombre: value,
      municipioId: null,
      municipioNombre: '',
      parroquiaId: null,
      parroquiaNombre: '',
    });
  };

  const handleMunicipioSelect = (value: string) => {
    onMunicipioChange(value);
    onParroquiaChange('');
    const municipioItem = municipioOptions.find((item) => item.nombre === value);
    onSelectionChange?.({
      estadoId: selectedState?.id ?? null,
      estadoNombre: estado,
      municipioId: municipioItem?.id ?? null,
      municipioNombre: value,
      parroquiaId: null,
      parroquiaNombre: '',
    });
  };

  const handleParroquiaSelect = (value: string) => {
    onParroquiaChange(value);
    const parroquiaItem = parroquiaOptions.find((item) => item.nombre === value);
    onSelectionChange?.({
      estadoId: selectedState?.id ?? null,
      estadoNombre: estado,
      municipioId: selectedMunicipio?.id ?? null,
      municipioNombre: municipio,
      parroquiaId: parroquiaItem?.id ?? null,
      parroquiaNombre: value,
    });
    close();
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

      <Text style={styles.label}>{labelParroquia}</Text>
      <TouchableOpacity
        style={[styles.pickerButton, !municipio && styles.disabledPicker]}
        onPress={open}
        disabled={!municipio}
      >
        <Text style={styles.pickerText}>{parroquia || (municipio ? `Seleccionar ${labelParroquia.toLowerCase()}` : 'Selecciona un municipio primero')}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Selecciona ubicación</Text>
            <Text style={styles.sectionTitle}>Estados</Text>
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {loading ? (
                <Text style={styles.emptyText}>Cargando catálogos...</Text>
              ) : loadError ? (
                <Text style={styles.emptyText}>{loadError}</Text>
              ) : estados.length > 0 ? (
                estados.map((item) => {
                  const selected = item.nombre === estado;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleEstadoSelect(item.nombre)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.nombre}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No hay estados disponibles</Text>
              )}
            </ScrollView>
            <Text style={styles.sectionTitle}>Municipios</Text>
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {municipioOptions.length > 0 ? (
                municipioOptions.map((item) => {
                  const selected = item.nombre === municipio;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleMunicipioSelect(item.nombre)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.nombre}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Selecciona primero un estado</Text>
              )}
            </ScrollView>
            <Text style={styles.sectionTitle}>Parroquias</Text>
            <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
              {parroquiaOptions.length > 0 ? (
                parroquiaOptions.map((item) => {
                  const selected = item.nombre === parroquia;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleParroquiaSelect(item.nombre)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.nombre}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Selecciona primero un municipio</Text>
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
