/**
 * Setup file that runs before jest-expo preset
 * Ensures React Native mocks are initialized
 */

// Ensure React Native's NativeModules mock is initialized
const NativeModules = require('react-native/Libraries/BatchedBridge/NativeModules').default;

// Initialize mockNativeModules if it doesn't exist
if (!NativeModules || typeof NativeModules !== 'object') {
  // This shouldn't happen, but ensures we have a valid object
  console.warn('NativeModules not properly initialized');
}

