import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { sharedFormStyles } from '../styles/sharedFormStyles';

type FormModalSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  saveLabel?: string;
  cancelLabel?: string;
};

export default function FormModalSheet({
  visible,
  title,
  onClose,
  onSave,
  children,
  saveLabel = 'Guardar',
  cancelLabel = 'Cancelar',
}: FormModalSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sharedFormStyles.modalOverlay}>
        <View style={sharedFormStyles.modalCard}>
          <ScrollView>
            <Text style={sharedFormStyles.modalTitle}>{title}</Text>
            {children}
            <View style={sharedFormStyles.modalActions}>
              <TouchableOpacity onPress={onClose}>
                <Text>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSave}>
                <Text style={sharedFormStyles.saveText}>{saveLabel}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
