import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { sharedFormStyles } from '../styles/sharedFormStyles';

type RoleSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function RoleSectionHeader({ title, subtitle, actions }: RoleSectionHeaderProps) {
  return (
    <View style={sharedFormStyles.headerRow}>
      <View style={sharedFormStyles.headerTextWrapper}>
        <Text style={sharedFormStyles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={sharedFormStyles.actionButtonsRow}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: '#475569',
    marginTop: 4,
  },
});
