export default {
  name: 'Producir es vencer FUNCN',
  slug: 'producir-es-vencer-funcn',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.jpeg',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.jpeg',
      backgroundColor: '#ffffff',
    },
    package: 'com.censocampesino',
    versionCode: 1,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://caracterizacioncampesina.onrender.com/api',
    apiPort: process.env.EXPO_PUBLIC_API_PORT || 3008,
  },
};