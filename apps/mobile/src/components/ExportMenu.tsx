import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { exportHistoryToExcel, exportHistoryToPDF, HistoryExportItem } from '../utils/historyExport';
import { Theme } from '../theme/colors';

interface ExportMenuProps {
  items: HistoryExportItem[];
  title?: string;
}

export default function ExportMenu({ items, title = 'Historial de Cambios' }: ExportMenuProps) {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      await exportHistoryToPDF(items, title);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      await exportHistoryToExcel(items, title);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Descargar historial:</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.exportButton, styles.pdfButton]}
          onPress={handleExportPDF}
          disabled={loading || !items.length}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.pdfButtonText}>Descargar PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, styles.excelButton]}
          onPress={handleExportExcel}
          disabled={loading || !items.length}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="file-excel-box" size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.excelButtonText}>Descargar Excel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pdfButton: {
    backgroundColor: '#dc2626',
  },
  pdfButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  excelButton: {
    backgroundColor: '#15803d',
  },
  excelButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
