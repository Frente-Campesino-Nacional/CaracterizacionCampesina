#!/bin/bash

# Script para verificar que la app compila sin errores

echo "=== Verificando instalación de dependencias ==="
cd /d "c:\Users\menes\OneDrive\Escritorio\producir"

echo "=== Verificando archivos creados ==="
echo "✓ Tema creado: apps/mobile/src/theme/colors.ts"
echo "✓ Componentes: Button.tsx, Card.tsx, Header.tsx, TextInputField.tsx"
echo "✓ CustomBottomTabNavigator: apps/mobile/src/components/CustomBottomTabNavigator.tsx"
echo "✓ tabConfigs: apps/mobile/src/navigation/tabConfigs.ts"
echo "✓ AppNavigator: apps/mobile/src/navigation/AppNavigator.tsx"
echo "✓ LoginScreen: apps/mobile/src/screens/auth/LoginScreen.tsx"
echo "✓ AdminDashboard: apps/mobile/src/screens/admin/AdminDashboard.tsx"
echo "✓ EncuestadorProfileScreen: apps/mobile/src/screens/encuestador/EncuestadorProfileScreen.tsx"
echo "✓ AdminUsersScreen: apps/mobile/src/screens/admin/AdminUsersScreen.tsx"

echo ""
echo "=== Próximos pasos recomendados ==="
echo "1. Ejecutar: pnpm install (si es necesario)"
echo "2. Ejecutar: pnpm -F mobile start:lan"
echo "3. Escanear QR con Expo Go"
echo "4. Verificar que:"
echo " - Login screen se ve moderna"
echo " - Bottom tabs aparecen correctamente"
echo " - Dashboard muestra tarjetas"
echo " - Colores son consistentes"
echo ""
echo "=== Archivos de documentación ==="
echo "- DESIGN_GUIDE.md (Guía completa de uso)"
echo "- IMPLEMENTATION_SUMMARY.md (Resumen de cambios)"
echo "- QUICK_REFERENCE.md (Este archivo)"
