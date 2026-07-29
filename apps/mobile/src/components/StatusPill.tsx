import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type StatusPillProps = {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

export default function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
});

const toneStyles = StyleSheet.create({
  success: { backgroundColor: '#dcfce7' },
  warning: { backgroundColor: '#fef3c7' },
  danger: { backgroundColor: '#fee2e2' },
  neutral: { backgroundColor: '#e2e8f0' },
});
