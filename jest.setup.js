/**
 * Jest setup file
 * Runs before each test file
 * Mocks AsyncStorage and other native modules
 */

// Extend Jest matchers for React Native Testing Library
require('@testing-library/react-native/extend-expect');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => {
        return Promise.resolve(storage[key] || null);
      }),
      setItem: jest.fn((key, value) => {
        storage[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        delete storage[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => {
        return Promise.resolve(Object.keys(storage));
      }),
      multiGet: jest.fn((keys) => {
        return Promise.resolve(keys.map((key) => [key, storage[key] || null]));
      }),
      multiSet: jest.fn((keyValuePairs) => {
        keyValuePairs.forEach(([key, value]) => {
          storage[key] = value;
        });
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((key) => delete storage[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    },
  },
}));

// Suppress console warnings/errors in tests (optional - comment out if you want to see them)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
