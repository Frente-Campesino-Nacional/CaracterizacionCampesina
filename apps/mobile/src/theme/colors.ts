/**
 * Color Palette - CensoCampesino
 * Paleta de colores centralizada para toda la aplicación
 * Sistema de diseño coherente y accesible
 */

export const Colors = {
  // Neutrales - Base
  white: '#FFFFFF',
  black: '#000000',
  
  // Grises - Textos y backgrounds
  darkGray: '#0F172A',      // Textos principales, cabeceras
  mediumGray: '#64748B',    // Textos secundarios
  lightGray: '#E2E8F0',     // Bordes, divisores
  veryLightGray: '#F1F5F9', // Fondos de tarjetas, backgrounds suaves
  
  // Verdes - Acento principal
  greenDark: '#166534',     // Verde oscuro - Botones, headers primarios
  greenMedium: '#4ADE80',   // Verde medio - Éxito, puntos activos
  greenLight: '#86EFAC',    // Verde claro - Fondos suaves, hover
  greenLightTransparent: 'rgba(134, 238, 172, 0.1)',
  
  // Estados
  success: '#22C55E',       // Verde éxito
  warning: '#EAB308',       // Amarillo advertencia
  error: '#EF4444',         // Rojo error
  info: '#0EA5E9',          // Azul información
  
  // Transparencias (con alpha)
  greenDarkTransparent: 'rgba(22, 101, 52, 0.1)',
  greenMediumTransparent: 'rgba(74, 222, 128, 0.1)',
  errorTransparent: 'rgba(239, 68, 68, 0.1)',
} as const;

/**
 * Tema con variables reutilizables para diseño
 */
export const Theme = {
  colors: Colors,
  
  // Espaciado (escala de 4px)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  // Tamaños de fuente
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
  },
  
  // Pesos de fuente
  fontWeight: {
    thin: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Sombras
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
  },
} as const;

export default Theme;
