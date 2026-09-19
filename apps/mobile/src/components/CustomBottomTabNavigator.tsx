/**
 * CustomBottomTabNavigator
 * Componente de navegación inferior personalizado con diseño moderno
 * Compatible con Admin y Encuestador
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme/colors';

interface TabConfig {
  name: string;
  label: string;
  icon: string;
  activeIcon?: string;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.lightGray,
    paddingBottom: 0,
    paddingHorizontal: 0,
    ...Theme.shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: Theme.colors.veryLightGray,
  },
  tabTopIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Theme.colors.greenDark,
    borderBottomLeftRadius: Theme.borderRadius.sm,
    borderBottomRightRadius: Theme.borderRadius.sm,
  },
  iconContainer: {
    marginBottom: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    marginTop: Theme.spacing.xs,
  },
  labelActive: {
    color: Theme.colors.greenDark,
  },
  labelInactive: {
    color: Theme.colors.mediumGray,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
  },
});

interface CustomBottomTabProps extends BottomTabBarProps {
  tabsConfig?: TabConfig[];
  badgeCount?: Record<string, number>;
}

export const CustomBottomTabNavigator: React.FC<CustomBottomTabProps> = ({
  state,
  descriptors,
  navigation,
  tabsConfig,
  badgeCount = {},
}) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const { options } = descriptor;
        const isFocused = state.index === index;
        
        // Usar configuración personalizada o labels por defecto
        const tabConfig = tabsConfig?.find((t) => t.name === route.name);
        const labelValue = tabConfig?.label || options.tabBarLabel || options.title || route.name;
        const label = typeof labelValue === 'string' ? labelValue : route.name;
        const icon = tabConfig?.icon || 'folder';
        const activeIcon = tabConfig?.activeIcon || icon;
        const displayIcon = isFocused ? activeIcon : icon;
        const badge = badgeCount[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            activeOpacity={0.7}
          >
            {isFocused && <View style={styles.tabTopIndicator} />}
            
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={displayIcon as any}
                size={24}
                color={isFocused ? Theme.colors.greenDark : Theme.colors.mediumGray}
              />
              {badge && badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.label,
                isFocused ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default CustomBottomTabNavigator;