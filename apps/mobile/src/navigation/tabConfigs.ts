/**
 * Navigation Tab Configurations
 * Iconografía y etiquetas para Admin y Encuestador
 */

export interface TabConfig {
  name: string;
  label: string;
  icon: string;
  activeIcon: string;
}

/**
 * Configuración de tabs para Administrador
 * 5 opciones principales del admin
 */
export const adminTabsConfig: TabConfig[] = [
  {
    name: 'AdminDashboard',
    label: 'Panel',
    icon: 'view-dashboard-outline',
    activeIcon: 'view-dashboard',
  },
  {
    name: 'AdminUsers',
    label: 'Usuarios',
    icon: 'account-multiple-outline',
    activeIcon: 'account-multiple',
  },
  {
    name: 'AdminCampesinos',
    label: 'Campesinos',
    icon: 'account-group-outline',
    activeIcon: 'account-group',
  },
  {
    name: 'AdminConsejos',
    label: 'Consejos',
    icon: 'city-variant-outline',
    activeIcon: 'city-variant',
  },
  {
    name: 'AdminFormularios',
    label: 'Formularios',
    icon: 'file-document-outline',
    activeIcon: 'file-document',
  },
  {
    name: 'AdminAuditoria',
    label: 'Auditoría',
    icon: 'shield-account-outline',
    activeIcon: 'shield-account',
  },
];

/**
 * Configuración de tabs para Encuestador
 * 3 opciones principales del encuestador
 */
export const encuestadorTabsConfig: TabConfig[] = [
  {
    name: 'EncuestadorDashboard',
    label: 'Campesinos',
    icon: 'map-search-outline',
    activeIcon: 'map-search',
  },
  {
    name: 'FormulariosPendientes',
    label: 'Pendientes',
    icon: 'clipboard-check-outline',
    activeIcon: 'clipboard-check',
  },
  {
    name: 'EncuestadorPerfil',
    label: 'Perfil',
    icon: 'account-outline',
    activeIcon: 'account',
  },
];

/**
 * Mapeo de iconos recomendados por categoría
 * Útil para otros componentes y pantallas
 */
export const iconMap = {
  // Navegación general
  home: 'home-outline',
  homeActive: 'home',
  menu: 'menu',
  back: 'arrow-left',
  close: 'close',
  search: 'magnify',
  filter: 'filter-outline',
  
  // Acciones comunes
  add: 'plus-circle-outline',
  edit: 'pencil-outline',
  delete: 'trash-can-outline',
  save: 'content-save-outline',
  download: 'download-outline',
  upload: 'upload-outline',
  
  // Estados
  success: 'check-circle-outline',
  warning: 'alert-outline',
  error: 'alert-circle-outline',
  info: 'information-outline',
  loading: 'loading',
  
  // Usuario y autenticación
  user: 'account-outline',
  logout: 'logout',
  settings: 'cog-outline',
  
  // Datos
  chart: 'chart-box-outline',
  statistics: 'chart-line',
  list: 'list-box-outline',
  grid: 'view-grid-outline',
  
  // Comunicación
  mail: 'email-outline',
  call: 'phone-outline',
  message: 'message-outline',
  
  // Otros
  sync: 'sync',
  refresh: 'refresh',
  share: 'share-outline',
  favorite: 'heart-outline',
  favoriteActive: 'heart',
  more: 'dots-vertical',
};