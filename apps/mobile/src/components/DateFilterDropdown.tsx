import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DATE_FILTER_OPTIONS, DateFilterPeriod } from '../utils/dateFilterUtils';
import { Theme } from '../theme/colors';

interface DateFilterDropdownProps {
  selectedPeriod: DateFilterPeriod;
  onSelectPeriod: (period: DateFilterPeriod) => void;
  customStartDate: string;
  customEndDate: string;
  onChangeCustomDates: (startDate: string, endDate: string) => void;
}

export default function DateFilterDropdown({
  selectedPeriod,
  onSelectPeriod,
  customStartDate,
  customEndDate,
  onChangeCustomDates,
}: DateFilterDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);

  const selectedOption = DATE_FILTER_OPTIONS.find((opt) => opt.key === selectedPeriod);

  const handleSelectOption = (key: DateFilterPeriod) => {
    onSelectPeriod(key);
    if (key !== 'custom') {
      setModalVisible(false);
    }
  };

  const handleApplyCustomDates = () => {
    onChangeCustomDates(tempStart, tempEnd);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtrar por fecha:</Text>

      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color={Theme.colors.greenDark}
            style={{ marginRight: 8 }}
          />

          <Text style={styles.triggerText}>{selectedOption?.label || 'Seleccionar período'}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#64748b" />
      </TouchableOpacity>

      {/* Modal de selección */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filtrar Historial por Fecha</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {DATE_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedPeriod === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => handleSelectOption(opt.key)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={20} color={Theme.colors.greenDark} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Sub-panel para Fecha Personalizada */}
                {selectedPeriod === 'custom' && (
                  <View style={styles.customSection}>
                    <Text style={styles.customTitle}>Rango de fechas (AAAA-MM-DD):</Text>
                    <View style={styles.dateInputsRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Desde:</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder="2026-08-01"
                          value={tempStart}
                          onChangeText={setTempStart}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Hasta:</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder="2026-08-09"
                          value={tempEnd}
                          onChangeText={setTempEnd}
                        />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustomDates}>
                      <Text style={styles.applyButtonText}>Aplicar Filtro Personalizado</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  optionRowSelected: {
    backgroundColor: '#f0fdf4',
  },
  optionText: {
    fontSize: 14,
    color: '#334155',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: Theme.colors.greenDark,
  },
  customSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  customTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  applyButton: {
    backgroundColor: Theme.colors.greenDark,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
