/**
 * Expo App Configuration
 * Reads environment variables from .env files
 */

module.exports = {
  expo: {
    name: 'Moment Roulette',
    slug: 'randommoment',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          'Moment Roulette needs access to your camera to capture video moments. We never record without your explicit action.',
        NSMicrophoneUsageDescription:
          'Moment Roulette needs access to your microphone to record audio with your videos. We never record without your explicit action.',
        NSPhotoLibraryUsageDescription:
          'Moment Roulette needs access to your photo library to save your approved moments.',
      },
      bundleIdentifier: 'com.momentroulette.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
      ],
      package: 'com.momentroulette.app',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Moment Roulette to access your camera to capture video moments.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#000000',
          sounds: [],
        },
      ],
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: 'cf4fb2ec-d76b-48f4-83b0-78a93b34bef1',
      },
    },
  },
};

