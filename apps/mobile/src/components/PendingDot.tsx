import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PendingDotProps {
  size?: number;
  color?: string;
}

export default function PendingDot({ size = 10, color = '#e53935' }: PendingDotProps) {
  return (
    <View
      accessibilityLabel="Tiene formularios pendientes"
      accessible
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 99,
  },
});
