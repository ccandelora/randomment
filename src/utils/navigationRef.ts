/**
 * Navigation Reference
 * 
 * Provides a navigation ref that can be accessed outside of React components.
 * Used for programmatic navigation from notification handlers, deep links, etc.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from '../types';

export type RootNavigation = typeof navigationRef;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen in the root navigator
 */
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params);
  }
}

/**
 * Navigate to a tab in MainTabs
 * Note: This requires the MainTabs to be mounted
 */
export function navigateToTab(name: keyof MainTabParamList) {
  if (navigationRef.isReady()) {
    try {
      // Navigate to MainTabs, then to the specific tab
      // Using nested navigation: MainTabs -> TabName
      navigationRef.navigate('MainTabs', {
        screen: name,
      } as any);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to navigate to tab:', error);
      }
    }
  }
}

