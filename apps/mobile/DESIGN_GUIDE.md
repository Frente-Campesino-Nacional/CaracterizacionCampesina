# Guía de Estilo - CensoCampesino

## 🎨 Sistema de Diseño Moderno

Esta es la guía completa para implementar el sistema de diseño moderno y profesional en la app CensoCampesino.

---

## ✅ Cambios Implementados (Fase 1)

### 1. **Navegación Modernizada** ✨

- ✅ Bottom Tabs personalizados con `CustomBottomTabNavigator`
- ✅ 5 tabs para Admin: Dashboard, Usuarios, Campesinos, Formularios, Auditoría
- ✅ 3 tabs para Encuestador: Campesinos, Pendientes, Perfil
- ✅ Iconos profesionales usando MaterialCommunityIcons
- ✅ Badges para notificaciones
- ✅ Indicadores visuales (línea superior en tab activo)

**Archivos:**

- `src/navigation/AppNavigator.tsx` - Navegadores principales (AdminNavigator, EncuestadorNavigator)
- `src/components/CustomBottomTabNavigator.tsx` - Componente personalizado de tabs
- `src/navigation/tabConfigs.ts` - Configuración de iconos y labels

### 2. **Login Screen Modernizado** 🎯

- ✅ Diseño card-based profesional
- ✅ Logo con icono de hoja (tema agrícola)
- ✅ Campos con validación mejorada y estados visuales
- ✅ Inputs con iconos integrados
- ✅ Botones con variantes modernas
- ✅ Espaciado y tipografía coherente
- ✅ KeyboardAvoidingView para mejor UX

**Archivo:** `src/screens/auth/LoginScreen.tsx`

### 3. **Admin Dashboard** 📊

- ✅ Diseño card-based con estadísticas
- ✅ Tarjetas de estadísticas (4 métricas principales)
- ✅ Acciones rápidas (2x2 grid)
- ✅ Actividad reciente con timeline
- ✅ Mensaje de bienvenida personalizado
- ✅ Iconografía consistente

**Archivo:** `src/screens/admin/AdminDashboard.tsx`

### 4. **Encuestador Profile Screen** 👤

- ✅ Avatar con icono de usuario
- ✅ Información personal del encuestador
- ✅ Grid de estadísticas (3 columnas)
- ✅ Sección de contacto
- ✅ Acciones (cambiar contraseña, logout)
- ✅ Diseño limpio y accesible

**Archivo:** `src/screens/encuestador/EncuestadorProfileScreen.tsx`

### 5. **Componentes Base Reutilizables** 🧩

- ✅ `Button.tsx` - 4 variantes (primary, secondary, outline, danger)
- ✅ `Card.tsx` - 3 variantes (default, bordered, elevated)
- ✅ `Header.tsx` - Encabezado con acciones
- ✅ `TextInputField.tsx` - Input con validación y contraseña
- ✅ Sistema de tema centralizado en `src/theme/colors.ts`

---

## 📋 Paleta de Colores

### Colores Base

```
Blanco:                 #FFFFFF
Negro/Gris Oscuro:      #0F172A  (Textos principales)
Gris Medio:             #64748B  (Textos secundarios)
Gris Claro:             #E2E8F0  (Bordes, divisores)
Gris Muy Claro:         #F1F5F9  (Fondos de tarjetas)
```

### Verdes - Acento Principal

```
Verde Oscuro:           #166534  (Botones, headers)
Verde Medio:            #4ADE80  (Éxito, puntos activos)
Verde Claro:            #86EFAC  (Fondos suaves, hover)
```

### Estados

```
Éxito:                  #22C55E  (Verde)
Advertencia:            #EAB308  (Amarillo)
Error:                  #EF4444  (Rojo)
Información:            #0EA5E9  (Azul)
```

---

## 🔧 Importar Tema

```typescript
import { Theme, Colors } from "../theme/colors";

// Usar colores directos
const color = Colors.greenDark;

// O usar del tema
const primaryColor = Theme.colors.greenDark;
const spacing = Theme.spacing.lg;
const fontSize = Theme.fontSize.base;
const shadow = Theme.shadows.md;
```

---

## 🧩 Componentes Reutilizables

### 1. **Button Component**

```typescript
import { Button } from '../components';

<Button
  label="Enviar"
  onPress={() => handleSubmit()}
  variant="primary"      // primary | secondary | outline | danger
  size="md"              // sm | md | lg
  icon="send"            // Icon name from MaterialCommunityIcons
  iconPosition="left"    // left | right
  fullWidth
  loading={false}
/>
```

**Variantes:**

- `primary`: Verde oscuro con texto blanco (acción principal)
- `secondary`: Verde claro con texto oscuro (acciones secundarias)
- `outline`: Transparente con borde verde (acciones ligeras)
- `danger`: Rojo con texto blanco (acciones destructivas)

---

### 2. **Card Component**

```typescript
import { Card } from '../components';

<Card variant="elevated" padding="md">
  <Text>Contenido de la tarjeta</Text>
</Card>
```

**Variantes:**

- `default`: Fondo blanco con borde gris suave
- `bordered`: Fondo blanco con borde verde claro
- `elevated`: Fondo blanco con sombra

**Padding:**

- `sm`: 12px
- `md`: 16px (default)
- `lg`: 20px

---

### 3. **Header Component**

```typescript
import { Header } from '../components';

<Header
  title="Campesinos"
  subtitle="Lista completa"
  leftIcon="arrow-left"
  rightIcon="dots-vertical"
  onLeftPress={() => navigation.goBack()}
  onRightPress={() => openMenu()}
  showBorder
/>
```

---

### 4. **TextInputField Component**

```typescript
import { TextInputField } from '../components';

<TextInputField
  label="Email"
  placeholder="correo@ejemplo.com"
  icon="email-outline"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  disabled={false}
  isPassword={false}
/>
```

**Con contraseña:**

```typescript
<TextInputField
  label="Contraseña"
  isPassword={true}
  value={password}
  onChangeText={setPassword}
/>
```

---

### 5. **CustomBottomTabNavigator**

Ya está integrado en AppNavigator. Para usar con configuración personalizada:

```typescript
import { CustomBottomTabNavigator } from '../components';
import { adminTabsConfig } from '../navigation/tabConfigs';

const Tab = createBottomTabNavigator();

<Tab.Navigator
  screenOptions={{
    header: () => null,
  }}
  tabBar={(props) => (
    <CustomBottomTabNavigator {...props} tabsConfig={adminTabsConfig} />
  )}
>
  {/* Tabs aquí */}
</Tab.Navigator>
```

---

## 📊 Espaciado (Escala de 4px)

```typescript
Theme.spacing = {
  xs: 4, // Espacios muy pequeños
  sm: 8, // Pequeños
  md: 12, // Medios
  lg: 16, // Grandes
  xl: 20, // Muy grandes
  xxl: 24, // Extra grandes
  xxxl: 32, // Máximo
};
```

---

## 🔤 Tamaños de Fuente

```typescript
Theme.fontSize = {
  xs: 11, // Etiquetas, badges
  sm: 12, // Textos pequeños
  base: 14, // Texto normal
  lg: 16, // Subtítulos
  xl: 18, // Títulos
  "2xl": 20, // Títulos grandes
  "3xl": 24, // Títulos muy grandes
  "4xl": 28, // Encabezados principales
};
```

---

## 📏 Border Radius

```typescript
Theme.borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
```

---

## ✨ Sombras

```typescript
Theme.shadows = {
  sm: {
    /* pequeña */
  },
  md: {
    /* media */
  }, // Usar para Cards elevadas
  lg: {
    /* grande */
  },
};
```

---

## 🎯 Iconografía Recomendada

### Admin Tabs (5 opciones)

1. **Dashboard**: `view-dashboard` / `view-dashboard-outline`
2. **Usuarios**: `account-multiple` / `account-multiple-outline`
3. **Campesinos**: `account-group` / `account-group-outline`
4. **Formularios**: `file-document` / `file-document-outline`
5. **Auditoría**: `shield-account` / `shield-account-outline`

### Encuestador Tabs (3 opciones)

1. **Campesinos**: `map-search` / `map-search-outline`
2. **Pendientes**: `clipboard-check` / `clipboard-check-outline`
3. **Perfil**: `account` / `account-outline`

Todos los iconos están en `@expo/vector-icons/MaterialCommunityIcons`

---

## 🎨 Ejemplo de Screen Modernizado

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Header, Card, Button, Theme } from '../components';

const CampesinoslsScreen = ({ navigation }) => {
  const [campesinos, setCampesinos] = useState([]);

  const handleAddCampesino = () => {
    // Acción
  };

  return (
    <View style={styles.container}>
      <Header
        title="Campesinos"
        subtitle="Gestionar registros"
        rightIcon="plus-circle-outline"
        onRightPress={handleAddCampesino}
        showBorder
      />

      <FlatList
        data={campesinos}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card variant="elevated" padding="md">
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.cardSubtitle}>{item.cedula}</Text>
            <Button
              label="Ver Detalles"
              size="sm"
              variant="outline"
              onPress={() => navigation.navigate('DetailScreen', { id: item.id })}
            />
          </Card>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  listContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  cardTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    marginBottom: Theme.spacing.md,
  },
});

export default CampesinoslsScreen;
```

---

## 🔄 Migración de Pantallas

### Para cada pantalla, seguir este orden:

1. **Header**: Agregar `<Header>` componente
2. **Contenedor**: Usar `backgroundColor: Theme.colors.white`
3. **Tarjetas**: Reemplazar ScrollView por `<Card>` componentes
4. **Botones**: Usar componente `<Button>` en lugar de TouchableOpacity
5. **Inputs**: Usar `<TextInputField>` para formularios
6. **Espaciado**: Usar valores de `Theme.spacing`
7. **Colores**: Usar constantes de `Theme.colors`

---

## 📱 Próximas Pantallas a Diseñar

- [ ] Login Screen
- [ ] Admin Dashboard
- [ ] Admin Users Screen
- [ ] Admin Campesinos Screen
- [ ] Admin Formularios Screen
- [ ] Admin Auditoria Screen
- [ ] Encuestador Dashboard
- [ ] Encuestador Pending Forms
- [ ] Encuestador Profile
- [ ] Dynamic Form Screen
- [ ] Submission Result Screen

---

## ✅ Checklist de Consistencia

- [ ] Todos los botones usan `<Button>` component
- [ ] Todas las tarjetas usan `<Card>` component
- [ ] Headers usan `<Header>` component
- [ ] Inputs usan `<TextInputField>` component
- [ ] Colores vienen de `Theme.colors`
- [ ] Espaciado usa `Theme.spacing`
- [ ] Fuentes usan `Theme.fontSize`
- [ ] Iconos son de MaterialCommunityIcons
- [ ] Sombras usan `Theme.shadows`
- [ ] Border radius usa `Theme.borderRadius`

---

## 🚀 Próximos Pasos

1. Actualizar `AppNavigator.tsx` para usar CustomBottomTabNavigator
2. Modernizar Login Screen
3. Modernizar Admin Dashboard
4. Modernizar todas las screens progressivamente
5. Agregar modo oscuro (opcional)
6. Agregar animaciones suaves con react-native-reanimated
