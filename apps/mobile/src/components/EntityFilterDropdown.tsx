import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ENTITY_FILTER_OPTIONS, EntityFilterOption, EntityFilterType } from '../utils/entityFilterUtils';

import { Theme } from '../theme/colors';

interface EntityFilterDropdownProps {
  selectedEntity: EntityFilterType;
  onSelectEntity: (entity: EntityFilterType) => void;
  options?: EntityFilterOption[];
}

export default function EntityFilterDropdown({
  selectedEntity,
  onSelectEntity,
  options,
}: EntityFilterDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const availableOptions = options || ENTITY_FILTER_OPTIONS;
  const selectedOption = availableOptions.find((opt) => opt.key === selectedEntity);

  const handleSelectOption = (key: EntityFilterType) => {
    onSelectEntity(key);
    setModalVisible(false);
  };


  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtrar por Entidad:</Text>

      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          <MaterialCommunityIcons
            name="shape-outline"
            size={20}
            color={Theme.colors.greenDark}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.triggerText}>{selectedOption?.label || 'Todas las entidades'}</Text>
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
                  <Text style={styles.modalTitle}>Filtrar por Tipo de Entidad</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {availableOptions.map((opt) => {

                  const isSelected = selectedEntity === opt.key;
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
});
